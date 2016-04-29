import feedparser
import io
import logging
import traceback

from collections import namedtuple
from concurrent import futures
from datetime import datetime
from greplin import scales
from greplin.scales import formats
from hashlib import sha1
from sociallists import db, events, media, river, http_util

logger = logging.getLogger('sociallists.feed')

def get_entry_id(entry):
    id = entry.get('id', None)
    if not id:
        # At one point I had written one of these algorithms on my own, but
        # these days I'm stealing the one that River5 uses.
        id = sha1((
            entry.get('published', '') +
            entry.get('link', '') +
            entry.get('title', '')
        ).encode('utf-8')).hexdigest()
    return id

def get_new_permanent_url(response):
    """Return the permanent URL for a request based on its response.

    This is a little complicated, and the code below might seem wrong on first
    inspection, so pay attention.

    The rationale for this chasing behavior is to treat temporary redirects
    as non-authoritative, that is, as soon as we hit a temporary redirect we
    can stop. Consider this history:

       a.com => 301 b.com
       b.com => 302 c.com
       c.com => 301 d.com
       d.com => 200

    In this case we want to update our records of a.com to b.com, since it's
    a permanent redirect. But next time, when we start at b.com, we don't care
    that c.com is permanently redirected to d.com -- we don't have c.com in
    our database, and maybe tomorrow b.com will send us a temporary redirect
    to somewhere else.

    Now, the .url properties of the responses in response.history are the URLs
    that were requested, not the URLs we were redirected to, but the
    .is_permanent_redirect field refers to the response we got from that URL.
    So it's easy-- we just need to find the first URL in our history for which
    .is_permanent_redirect returns False, and that's where we should live.
    """
    response_history = response.history + [ response ]
    for h in response_history:
        if not h.is_permanent_redirect:
            final_url = h.url

    # If there weren't any temporary redirects we'll get down here.
    return response.url

def store_item_thumbnail(item):
    """Write a river item's thumbnail into the database, and rewrite the
    thumbnail to include a database reference.

    (Replace __image, which is a PIL image, with __blob, which is the hash key
    to the image stored in the database.)
    """
    thumbnail = item.get('thumbnail')
    if thumbnail is not None:
        image = thumbnail.get('__image')
        if image is not None:
            bio = io.BytesIO()
            image.save(bio, 'png')
            with db.session() as db_session:
                blob = db.store_blob(db_session, 'image/png', bio.getbuffer())
                hash = blob.hash
                db_session.commit()

            del thumbnail['__image']
            thumbnail['__blob'] = hash

FeedUpdate = namedtuple('FeedUpdate', ['feed', 'river', 'history', 'time'])
FeedUpdate.__doc__ = "A record of the results of checking for a feed update."
FeedUpdate.feed.__doc__ = "The parsed feed from the feed parser."
FeedUpdate.river.__doc__ = "The river computed from the parsed feed."
FeedUpdate.history.__doc__ = "The new history list from the feed."
FeedUpdate.time.__doc__ = "The official time of the update (UTC)."

class FeedUpdater(object):
    """A little object that updates a feed.

    The existance of this class was forced by the way that scales (the metrics
    library) works, but we take advantage of it nonetheless.
    """

    feed_entries = scales.IntStat('feed_entries')
    new_entries = scales.IntStat('new_entries')
    state = scales.Stat('state')
    url = scales.Stat('url')
    thumbnail_from_content = scales.IntStat('thumbnail_from_content')
    thumbnail_from_link = scales.IntStat('thumbnail_from_link')
    thumbnail_from_summary = scales.IntStat('thumbnail_from_summary')
    update_time = scales.PmfStat('update_time')

    def __init__(self, db_session, feed):
        scales.initChild(self, feed.id)
        self.db_session = db_session
        self.feed = feed
        self.http_session = http_util.session()
        self.state = 'Created'
        self.url = feed.url

    def do_rename_feed(self, new_url):
        """Set the url of the feed, unless the new URL is already in the DB.

        Returns True if the URL was set, or False if the rivers were changed to
        refer to an existing feed."""
        existing_feed = db.load_feed_by_url(self.db_session, new_url)
        if not existing_feed:
            self.feed.url = new_url
            return True

        # Renaming to existing feed. Need to renumber things appropriately.
        rivers = db.load_rivers_by_feed(self.db_session, self.feed)
        for river in rivers:
            river.feeds.remove(self.feed)
            if not existing_feed in river.feeds:
                river.feeds.append(existing_feed)
        return False

    def do_fetch_feed(self):
        """Fetch and parse the feed, returning the parsed feed.

        Does not modify the feed object."""
        headers = {
            'If-Modified-Since': self.feed.modified_header,
            'If-None-Match': self.feed.etag_header,
        }

        response = self.http_session.get(
            self.feed.url,
            headers=headers,
            timeout=(10.05,30),
        )
        logger.info('Feed {feed_url} => {response_url}, {response_status}'.format(
            feed_url=self.feed.url,
            response_url=response.url,
            response_status=response.status_code,
        ))

        f = feedparser.parse(http_util.FeedparserShim(response))

        # Universal feed parser is nice but doesn't do the right analysis on the
        # request history, so we correct it here.
        f.href = get_new_permanent_url(response)
        f.status = response.status_code
        return f

    def get_feed_update(self, history):
        """Compute a FeedUpdate for the given feed given the state of the world
        now.

        This isn't side-effect free, since it does network IO, but it does not
        modify the feed object.
        """
        update_time = datetime.utcnow()
        logger.info('Updating feed {url} ({etag}/{modified}) @ {now}'.format(
            url=self.feed.url,
            etag=self.feed.etag_header,
            modified=self.feed.modified_header,
            now=update_time.isoformat(),
        ))

        f = self.do_fetch_feed()
        self.feed_entries = len(f.entries)

        entries_with_ids = [
            (get_entry_id(entry), entry) for entry in f.entries
        ]
        new_entries = [
            e_id[1] for e_id in entries_with_ids if e_id[0] not in history
        ]

        f.entries = new_entries
        self.new_entries = len(f.entries)

        river_update = river.feed_to_river_update(
            f, self.feed.next_item_id, update_time, self.http_session
        )

        new_history = [ e_id[0] for e_id in entries_with_ids ]

        return FeedUpdate(
            feed=f,
            river=river_update,
            history=new_history,
            time=update_time,
        )

    def apply_feed_update(self, update):
        """Apply the updates in the specified update to the feed object."""
        if self.feed.url != update.feed.href:
            if not self.do_rename_feed(update.feed.href):
                logger.info("Marking %s dead after rename" % feed.url)
                self.feed.last_status = 410
                self.state = 'Renamed'
                return

        if len(update.feed.entries) > 0:
            self.feed.next_item_id += len(update.feed.entries)
            for item in update.river['item']:
                store_item_thumbnail(item)
            db.store_river(
                self.db_session,
                self.feed,
                update.time,
                update.river,
            )
            db.store_history(self.db_session, self.feed, update.history)
            self.state = 'Updated'
        else:
            self.state = 'Unchanged'

        self.feed.etag_header = update.feed.get('etag', None)
        self.feed.modified_header = update.feed.get('modified', None)
        self.feed.last_status = update.feed.status

    def do_update_feed(self):
        with self.update_time.time():
            try:
                if self.feed.last_status == 410:
                    logger.info(
                        'Skipping feed {url} because it is HTTP_GONE'.format(
                            url=self.feed.url,
                        ),
                    )
                    self.state = 'Dead'
                    return None

                history = db.load_history_set(self.db_session, self.feed)
                update = self.get_feed_update(history)
                self.apply_feed_update(update)
                self.db_session.add(self.feed)
                self.db_session.commit()
            except:
                e = traceback.format_exc()
                logger.warning('Error updating feed {url}: {e}'.format(
                    url=self.feed.url,
                    e=e,
                ))
                self.state = 'Failed'
                self.db_session.rollback()

class FeedUpdateBatch(object):
    feed_entries = scales.SumAggregationStat('feed_entries')
    new_entries = scales.SumAggregationStat('new_entries')
    state = scales.HistogramAggregationStat('state')
    thumbnail_from_content = scales.SumAggregationStat('thumbnail_from_content')
    thumbnail_from_link = scales.SumAggregationStat('thumbnail_from_link')
    thumbnail_from_summary = scales.SumAggregationStat('thumbnail_from_summary')
    update_time = scales.PmfStat('update_time')

    def __init__(self):
        scales.init(self, '/feed_updates')

    def update_feed(self, feed):
        """Update a single feed."""
        with db.session() as db_session:
            u = FeedUpdater(db_session, feed)
            u.do_update_feed()

    def update_feeds(self, feed_list, sync):
        if not sync:
            with futures.ThreadPoolExecutor() as executor:
                threads = [
                    executor.submit(self.update_feed, feed)
                    for feed in feed_list
                ]
                futures.wait(threads)
        else:
            for feed in feed_list:
                self.update_feed(feed)

    def log_stats(self):
        logger.info('Items processed: {c}'.format(c=self.feed_entries))
        logger.info('New items found: {c}'.format(c=self.new_entries))
        events.log_stats()


def do_update_feed(db_session, feed):
    u = FeedUpdater(db_session, feed)
    u.do_update_feed()


#######################################

def update_feeds_cmd(args):
    """Update all of the subscribed feeds."""
    with db.session() as db_session:
        if args.all:
            feeds = db.load_all_feeds(db_session)
        else:
            feeds = [ db.load_feed_by_url(db_session, args.url) ]

    batch = FeedUpdateBatch()
    batch.update_feeds(feeds, args.sync)
    batch.log_stats()


def reset_feeds_cmd(args):
    """Reset cached state of all of the subscribed feeds."""
    with db.session() as db_session:
        if args.all:
            feeds = db.load_all_feeds(db_session)
        else:
            feeds = [ db.load_feed_by_url(db_session, args.url) ]

        for feed in feeds:
            print('Resetting feed {url} ({etag}/{modified})'.format(
                url=feed.url,
                etag=feed.etag_header,
                modified=feed.modified_header,
            ))
            feed.reset()
        db_session.commit()

def list_feeds_cmd(args):
    with db.session() as db_session:
        feeds = db.load_all_feeds(db_session)

    for feed in feeds:
        print('{feed}'.format(
            feed=str(feed),
        ))
    print('{count} feed(s)'.format(
        count=len(feeds),
    ))

def add_feed_cmd(args):
    with db.session() as db_session:
        db.add_feed(db_session, args.url)
        db_session.commit()

if __name__=='__main__':
    import argparse

    parser = argparse.ArgumentParser(description="sociallists feed related commands")
    sps = parser.add_subparsers(dest='cmd')

    cp = sps.add_parser('update', help='Update one or all feeds')
    cp.set_defaults(func=update_feeds_cmd)
    cp.add_argument("--sync", help="Update the feeds asynchronously", action="store_true")
    g = cp.add_mutually_exclusive_group(required=True)
    g.add_argument("-a", "--all", help="Update all feeds", action="store_true")
    g.add_argument("-u", "--url", help="Update the specified URL")

    cp = sps.add_parser('reset', help='Reset one or all feeds')
    cp.set_defaults(func=reset_feeds_cmd)
    g = cp.add_mutually_exclusive_group(required=True)
    g.add_argument("-a", "--all", help="Reset all feeds", action="store_true")
    g.add_argument("-u", "--url", help="Reset a single URL")

    cp = sps.add_parser('add', help='Add a feed to the DB')
    cp.set_defaults(func=add_feed_cmd)
    cp.add_argument('url', help="The URL to add to the DB")

    cp = sps.add_parser('list', help='List all feeds in the DB', aliases=["ls"])
    cp.set_defaults(func=list_feeds_cmd)

    args = parser.parse_args()
    if args.cmd:
        level = logging.INFO
        logging.basicConfig(
            format='%(asctime)s %(message)s',
            level=level,
        )
        args.func(args)
    else:
        parser.print_usage()

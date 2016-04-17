import feedparser
import io
import logging
import traceback

from collections import namedtuple
from concurrent import futures
from datetime import datetime
from hashlib import sha1
from sociallists import db, media, river, http_util
from time import perf_counter

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

def do_rename_feed(db_session, feed, new_url):
    """Set the url of the given feed, unless the new URL is already in the DB.

    Returns True if the URL was set, or False if the rivers were changed to
    refer to an existing feed."""
    existing_feed = db.load_feed_by_url(db_session, new_url)
    if not existing_feed:
        feed.url = new_url
        return True

    # Renaming to existing feed. Need to renumber things appropriately.
    rivers = db.load_rivers_by_feed(db_session, feed)
    for river in rivers:
        river.feeds.remove(feed)
        if not existing_feed in river.feeds:
            river.feeds.append(existing_feed)
    return False

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

def do_fetch_feed(feed, http_session):
    """Fetch and parse the feed, returning the parsed feed.

    Does not modify the feed object."""
    headers = {
        'If-Modified-Since': feed.modified_header,
        'If-None-Match': feed.etag_header,
    }

    response = http_session.get(feed.url, headers=headers, timeout=(10.05,30))
    logger.info('Feed {feed_url} => {response_url}, {response_status}'.format(
        feed_url=feed.url,
        response_url=response.url,
        response_status=response.status_code,
    ))

    f = feedparser.parse(http_util.FeedparserShim(response))

    # Universal feed parser is nice but doesn't do the right analysis on the
    # request history, so we correct it here.
    f.href = get_new_permanent_url(response)
    f.status = response.status_code
    return f


def get_item_thumbnail(item, http_session):
    """Attempt to synthesize a thumbnail for this item if there isn't one.

    This is here instead of in river.py because it can be very very slow, and
    is not really part of converting rivers. Also we need to understand the
    __image key and rewrite it before it goes to JSON.
    """
    thumbnail = item.get('thumbnail')
    if thumbnail is None:
        size = (400,400)
        img = media.get_url_image(item['link'], size, http_session)
        if img:
            thumbnail = { '__image': img, 'width': size[0], 'height': size[1] }
    return thumbnail

def store_item_thumbnail(item):
    thumbnail = item.get('thumbnail')
    if thumbnail is not None:
        image = thumbnail.get('__image')
        if image is not None:
            bio = io.BytesIO()
            image.convert('RGB').save(bio, 'jpeg')
            with db.session() as db_session:
                blob = db.store_blob(db_session, 'image/jpeg', bio.getbuffer())
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

def get_feed_update(feed, history):
    """Compute a FeedUpdate for the given feed given the state of the world now.

    This isn't side-effect free, since it does network IO, but it does not
    modify the feed object.
    """
    update_time = datetime.utcnow()
    logger.info('Updating feed {url} ({etag}/{modified}) @ {now}'.format(
        url=feed.url,
        etag=feed.etag_header,
        modified=feed.modified_header,
        now=update_time.isoformat(),
    ))

    http_session = http_util.session()
    f = do_fetch_feed(feed, http_session)

    logger.info('Feed {url} has {count} entries'.format(
        url=f.href,
        count=len(f.entries),
    ))

    entries_with_ids = [ (get_entry_id(entry), entry) for entry in f.entries ]
    new_entries = [
        e_id[1] for e_id in entries_with_ids if e_id[0] not in history
    ]

    f.entries = new_entries
    logger.info('Feed {url} has {count} NEW entries'.format(
        url=f.href,
        count=len(f.entries),
    ))

    river_update = river.feed_to_river_update(
        f, feed.next_item_id, update_time, http_session
    )
    for item in river_update['item']:
        thumb = get_item_thumbnail(item, http_session)
        if thumb:
            item['thumbnail'] = thumb

    new_history = [ e_id[0] for e_id in entries_with_ids ]

    return FeedUpdate(
        feed=f,
        river=river_update,
        history=new_history,
        time=update_time,
    )

def apply_feed_update(db_session, feed, update):
    """Apply the updates in the specified update to the feed object."""
    if feed.url != update.feed.href:
        if not do_rename_feed(db_session, feed, update.feed.href):
            logger.info("Marking %s dead after rename" % feed.url)
            feed.last_status = 410
            return

    if len(update.feed.entries) > 0:
        feed.next_item_id += len(update.feed.entries)
        for item in update.river['item']:
            store_item_thumbnail(item)
        db.store_river(db_session, feed, update.time, update.river)
        db.store_history(db_session, feed, update.history)

    feed.etag_header = update.feed.get('etag', None)
    feed.modified_header = update.feed.get('modified', None)
    feed.last_status = update.feed.status

def do_update_feed(db_session, feed):
    if feed.last_status == 410:
        logger.info('Skipping feed %s because it is HTTP_GONE' % feed.url)
        return None
    else:
        history = db.load_history_set(db_session, feed)
        update = get_feed_update(feed, history)
        apply_feed_update(db_session, feed, update)
        db_session.add(feed)
        return update

def update_feed(feed):
    """Update a single feed."""
    with db.session() as db_session:
        try:
            update = do_update_feed(db_session, feed)
            db_session.commit()

            logger.info('Successfully updated feed {url}'.format(url=feed.url))
            return (feed, update, None)
        except:
            e = traceback.format_exc()
            logger.warning('Error updating feed {url}: {e}'.format(
                url=feed.url,
                e=e,
            ))
            db_session.rollback()
            return (feed, None, e)

#######################################

def log_update_summary(feeds, elapsed_time, results):
    logger.info(
        'Updated {count} feeds in {time:.3} seconds ({fps:.2} feeds/sec)'.format(
            count=len(feeds),
            time=elapsed_time,
            fps=len(feeds)/elapsed_time,
        )
    )

    new_feeds = []
    error_feeds = []

    for feed, update, error in results:
        if update is not None and len(update.feed.entries) > 0:
            new_feeds.append('Feed {url} has {count} new entries'.format(
                url=feed.url,
                count=len(update.feed.entries),
            ))
        if error is not None:
            error_feeds.append('Feed {url} had error: {error}'.format(
                url=feed.url,
                error=error
            ))
    for ef in error_feeds:
        logger.info(ef)
    for nf in new_feeds:
        logger.info(nf)

def update_feeds_cmd(args):
    """Update all of the subscribed feeds."""
    start_time = perf_counter()
    with db.session() as db_session:
        if args.all:
            feeds = db.load_all_feeds(db_session)
        else:
            feeds = [ db.load_feed_by_url(db_session, args.url) ]

    if not args.sync:
        with futures.ThreadPoolExecutor() as executor:
            threads = [ executor.submit(update_feed, feed) for feed in feeds ]
            r = futures.wait(threads)
            results = [ f.result() for f in r.done ]
    else:
        results = [update_feed(feed) for feed in feeds]

    end_time = perf_counter()
    elapsed_time = end_time - start_time
    log_update_summary(feeds, elapsed_time, results)

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

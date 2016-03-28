import feedparser
import logging
import requests
import sys

from datetime import datetime
from gevent import monkey,spawn,wait
from hashlib import sha1
from sociallists import db, river
from time import perf_counter

logger = logging.getLogger('sociallists.feed')

s = requests.Session()
a = requests.adapters.HTTPAdapter(max_retries=3)
s.mount('http://', a)
s.mount('https://', a)

session = s

class RequestsFeedparserShim(object):
    """Map a requests Response object to one feedparser can use directly."""
    def __init__(self, response):
        self.response = response

        self.headers = response.headers
        self.url = response.url
        self.status = response.status_code
        self.code = response.status_code

    def read(self):
        return self.response.content

    def close(self):
        self.response.close()


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

def do_rename_feed(feed, new_url):
    """Set the url of the given feed, unless the new URL is already in the DB.

    Returns True if the URL was set, or False if the rivers were changed to
    refer to an existing feed."""
    existing_feed = db.load_feed_by_url(new_url)
    if not existing_feed:
        feed.url = new_url
        return True

    # Renaming to existing feed. Need to renumber things appropriately.
    rivers = db.load_rivers_by_feed(feed)
    for river in rivers:
        river.feeds.remove(feed)
        if not existing_feed in river.feeds:
            river.feeds.append(existing_feed)
    return False

def do_update_feed(feed):
    update_time = datetime.utcnow()
    logger.info('Updating feed {url} ({etag}/{modified}) @ {now}'.format(
        url=feed.url,
        etag=feed.etag_header,
        modified=feed.modified_header,
        now=update_time.isoformat(),
    ))

    if feed.last_status == 410:
        logger.info('Skipping feed %s because it is HTTP_GONE' % feed.url)
        return

    headers = {
        'If-Modified-Since': feed.modified_header,
        'If-None-Match': feed.etag_header,
    }

    response = session.get(feed.url, headers=headers, timeout=(10.05,30))
    logger.info('Feed %s => %s, %d' % (feed.url, response.url, response.status_code))

    # The .url properties of the history responses are the URLs *before* the redirect
    # was followed, so it's the .url of the next response we care about. As
    # soon as a response in the history is not a permanent redirect, we can
    # record that URL, and stop chasing the chain.
    response_history = response.history + [ response ]
    for h in response_history:
        if not h.is_permanent_redirect:
            if feed.url != h.url:
                if not do_rename_feed(feed, h.url):
                    logger.info("Marking '%s' as dead after rename" % feed.url)
                    feed.last_status = 410
                    return

    f = feedparser.parse(RequestsFeedparserShim(response))
    logger.info('Feed {url} has {count} entries'.format(
        url=feed.url,
        count=len(f.entries),
    ))

    entries_with_ids = [ (get_entry_id(entry), entry) for entry in f.entries ]
    history = db.load_history_set(feed)
    new_entries = [
        e_id[1] for e_id in entries_with_ids if e_id[0] not in history
    ]

    f.entries = new_entries
    logger.info('Feed {url} has {count} NEW entries'.format(
        url=feed.url,
        count=len(f.entries),
    ))

    if len(f.entries) > 0:
        r_new = river.feed_to_river_update(f, feed.next_item_id, update_time, session)
        feed.next_item_id += len(f.entries)
        db.store_river(feed, update_time, r_new)
        db.store_history(feed, [ e_id[0] for e_id in entries_with_ids ])

    feed.etag_header = f.get('etag', None)
    feed.modified_header = f.get('modified', None)
    feed.last_status = response.status_code

def update_feed(feed):
    try:
        do_update_feed(feed)
        db.session.commit()

        logger.info('Successfully updated feed {url}'.format(url=feed.url))
    except:
        e = sys.exc_info()
        logger.warning('Error updating feed {url}: {e}'.format(url=feed.url,e=e))
        db.session.rollback()


#######################################

def update_feeds(args):
    """Update all of the subscribed feeds."""
    start_time = perf_counter()
    if args.all:
        feeds = db.load_all_feeds()
    else:
        feeds = [ db.load_feed_by_url(args.url) ]

    if not args.sync:
        monkey.patch_all()
        threads = [spawn(update_feed, feed) for feed in feeds]
        wait(threads)
    else:
        for feed in feeds:
            update_feed(feed)

    end_time = perf_counter()
    elapsed_time = end_time - start_time
    logger.info(
        'Updated {count} feeds in {time:.3} seconds ({fps:.2} feeds/sec)'.format(
            count=len(feeds),
            time=elapsed_time,
            fps=len(feeds)/elapsed_time,
        )
    )

def reset_feeds(args):
    """Reset cached state of all of the subscribed feeds."""
    if args.all:
        feeds = db.load_all_feeds()
    else:
        feeds = [ db.load_feed_by_url(args.url) ]

    for feed in feeds:
        print('Resetting feed {url} ({etag}/{modified})'.format(
            url=feed.url,
            etag=feed.etag_header,
            modified=feed.modified_header,
        ))
        feed.reset()
    db.session.commit()

def list_feeds(args):
    feeds = db.load_all_feeds()
    for feed in feeds:
        print('{feed}'.format(
            feed=str(feed),
        ))
    print('{count} feed(s)'.format(
        count=len(feeds),
    ))

def add_feed(args):
    db.add_feed(args.url)
    db.session.commit()

if __name__=='__main__':
    import argparse

    parser = argparse.ArgumentParser(description="sociallists feed related commands")
    parser.add_argument("-v", "--verbose", help="Verbose output", action="store_true")
    sps = parser.add_subparsers(dest='cmd')

    cp = sps.add_parser('update', help='Update one or all feeds')
    cp.set_defaults(func=update_feeds)
    cp.add_argument("--sync", help="Update the feeds asynchronously", action="store_true")
    g = cp.add_mutually_exclusive_group(required=True)
    g.add_argument("-a", "--all", help="Update all feeds", action="store_true")
    g.add_argument("-u", "--url", help="Update the specified URL")

    cp = sps.add_parser('reset', help='Reset one or all feeds')
    cp.set_defaults(func=reset_feeds)
    g = cp.add_mutually_exclusive_group(required=True)
    g.add_argument("-a", "--all", help="Reset all feeds", action="store_true")
    g.add_argument("-u", "--url", help="Reset a single URL")

    cp = sps.add_parser('add', help='Add a feed to the DB')
    cp.set_defaults(func=add_feed)
    cp.add_argument('url', help="The URL to add to the DB")

    cp = sps.add_parser('list', help='List all feeds in the DB', aliases=["ls"])
    cp.set_defaults(func=list_feeds)

    args = parser.parse_args()
    if args.cmd:
        level = logging.WARNING
        if args.verbose:
            level = logging.INFO

        logging.basicConfig(
            format='%(asctime)s %(message)s',
            level=level,
        )
        args.func(args)
    else:
        parser.print_usage()

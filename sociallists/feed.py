import feedparser
import logging
import requests
import sys

from datetime import datetime
from hashlib import sha1
from sociallists import db, river

logger = logging.getLogger('sociallists.feed')

session = requests.Session()

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

def update_feed(feed):
    try:
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

        if response.is_permanent_redirect:
            logger.info('(Noting permanent redirect for %s => %s)' % (feed.url, response.url))
            feed.url = response.url

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
        db.session.commit()

        logger.info('Successfully updated feed {url}'.format(url=feed.url))
    except:
        e = sys.exc_info()
        logger.warning('Error updating feed {url}: {e}'.format(url=feed.url,e=e))


#######################################

def update_feeds(args):
    """Update all of the subscribed feeds."""
    if args.all:
        feeds = db.load_all_feeds()
    else:
        feeds = [ db.load_feed_by_url(args.url) ]

    for feed in feeds:
        update_feed(feed)

def reset_feeds(args):
    """Reset cached state of all of the subscribed feeds."""
    if args.all:
        feeds = db.load_all_feeds()
    else:
        feeds = [ db.load_feed_by_url(args.url) ]

    for feed in feeds:
        logger.info('Resetting feed {url} ({etag}/{modified})'.format(
            url=feed.url,
            etag=feed.etag_header,
            modified=feed.modified_header,
        ))
        feed.reset()
    db.session.commit()

def list_feeds(args):
    feeds = db.load_all_feeds()
    for feed in feeds:
        logger.info('{url} ({etag}/{modified}/{status})'.format(
            url=feed.url,
            etag=feed.etag_header,
            modified=feed.modified_header,
            status=feed.last_status,
        ))

def add_feed(args):
    db.add_feed(args.url)
    db.session.commit()

if __name__=='__main__':
    import argparse
    logging.basicConfig(format='%(asctime)s %(message)s', level=logging.INFO)

    parser = argparse.ArgumentParser(description="sociallists feed related commands")
    sps = parser.add_subparsers(dest='cmd')

    cp = sps.add_parser('update', help='Update one or all feeds')
    cp.set_defaults(func=update_feeds)
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
        args.func(args)
    else:
        parser.print_usage()
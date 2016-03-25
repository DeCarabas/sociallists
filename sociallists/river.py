import logging
import requests
import time

from sociallists import db

from datetime import datetime
from email import utils
from html.parser import HTMLParser
from itertools import count

logger = logging.getLogger('sociallists.river')

def is_guid_link(guid, session=None):
    """Figure out if the given GUID appears to be a link to something."""
    if not guid:
        return False
    if session is None:
        session = requests.Session()
    try:
        resp = session.head(guid, timeout=30)
        resp.raise_for_status()
        return True
    except:
        return False

def strip_html(text):
    """Remove markup and return the raw text.

    >>> strip_html("<p>Hello there, how <b>lovely</b> to see you!</p>")
    'Hello there, how lovely to see you!'
    """
    class MarkupStripper(HTMLParser):
        def __init__(self):
            self.reset()
            self.data = []
            self.total_len = 0
            self.convert_charrefs = True

        def handle_data(self, d):
            self.data.append(d)
            self.total_len += len(d)
            if self.total_len >= 280:
                raise StopIteration()

        def get_text(self):
            return ''.join(self.data)

    s = MarkupStripper()
    try:
        s.feed(text)
    except StopIteration:
        pass
    return s.get_text()

def convert_description(description):
    """Sanitize a river.js item description.

    This means stripping out HTML, and appending an ellipsis if it's longer
    than 280 characters."""
    clean = strip_html(description)
    if len(clean) > 280:
        clean = clean[:277] + "..."
    return clean

def time_to_rfc2822(tt):
    """Convert a time tuple to an RFC 2822 string."""
    return utils.formatdate(time.mktime(tt))

def datetime_to_rfc2822(dt):
    """Convert a datetime object to an RFC 2822 string."""
    return time_to_rfc2822(dt.timetuple())

def get_entry_pubDate(e):
    """Return the appropriate pubDate for an entry."""
    tt = e.get('published_parsed', None)
    if tt is None:
        tt = e.get('updated_parsed', None)

    if tt is not None:
        return time_to_rfc2822(e.published_parsed)
    else:
        return ''

def get_entry_permalink(e, session=None):
    guid = e.get('guid', None)
    link = e.get('link', None)
    if link == guid:
        return link
    if guid and is_guid_link(guid, session):
        return guid
    else:
        return ''

def entry_to_river(entry, i, session=None):
    """Convert a feed entry to a river.js item"""
    # TODO: See if you can pull a thumbnail.
    # TODO: See if you can pull enclosures.

    return {
        "title": entry.get('title', ''),
        "link": entry.get('link', ''),
        "body": convert_description(entry.get('description', '')),
        "pubDate": get_entry_pubDate(entry),
        "permaLink": get_entry_permalink(entry, session),
        "id": str(i),
    }

def wrap_feed_updates(feed_updates):
    """Wrap an array of feed updates in the broader river.js format"""
    return {
        'updatedFeeds': {
            'updatedFeed': feed_updates,
        },
        'metadata': {
            "docs": "http://riverjs.org/",
        },
    }

def feed_to_river_update(feed, start_id, update_time=None, session=None):
    """Convert a feed object from feedparser to a river.js format"""
    if update_time is None:
        update_time = datetime.utcnow()

    return {
        "feedTitle": feed.feed.title,
        "feedUrl": feed.href,
        "websiteUrl": feed.feed.link,
        "feedDescription": feed.feed.subtitle,
        "whenLastUpdate": datetime_to_rfc2822(update_time),
        "item": [
            entry_to_river(e, i, session)
            for e,i in zip(feed.entries, count(start_id))
        ],
    }

def feed_to_river(feed, start_id):
    """Convert a feed object from feedparser to a river.js format"""
    return wrap_feed_updates([feed_to_river_update(feed, start_id)])

#######################################

def add_feed(args):
    feed = db.load_feed_by_url(args.url)
    if not feed:
        logger.info("Feed '{url}' not found in database. Adding...".format(
            url=args.url,
        ))
        feed = db.add_feed(args.url)

    river = db.load_river_by_name(args.user, args.river)
    if not river:
        logger.info('River {user}/{river} not found, creating...'.format(
            user=args.user,
            river=args.river,
        ))
        river = db.create_river(args.user, args.river)

    if feed in river.feeds:
        logger.info("Feed '{url}' already in river '{user}/{river}'...".format(
            url=args.url,
            user=args.user,
            river=args.river,
        ))
    else:
        logger.info("Added feed '{url}' to river '{user}/{river}'...".format(
            url=args.url,
            user=args.user,
            river=args.river,
        ))
        river.feeds.append(feed)
    db.session.commit()

def list_rivers(args):
    rivers = db.load_rivers_by_user(args.user)
    for r in rivers:
        logger.info('{name}'.format(
            name=r.name,
        ))
    logger.info('{count} river(s)'.format(
        count=len(rivers),
    ))

def show_river(args):
    river = db.load_river_by_name(args.user, args.name)
    for feed in river.feeds:
        logger.info(str(feed))
    logger.info('{count} feeds(s)'.format(
        count=len(river.feeds),
    ))

if __name__=='__main__':
    import argparse
    logging.basicConfig(format='%(asctime)s %(message)s', level=logging.INFO)

    parser = argparse.ArgumentParser(description="sociallists river related commands")
    parser.add_argument("-u", "--user", help="The user whose list we're modifying", required=True)

    sps = parser.add_subparsers(dest='cmd')

    cp = sps.add_parser('add', help="Add a feed to a user's river")
    cp.set_defaults(func=add_feed)
    cp.add_argument('river', help="The name of the river to augment")
    cp.add_argument('url', help="The URL to add to the DB")

    cp = sps.add_parser('list', help="List all the user's rivers", aliases=["ls"])
    cp.set_defaults(func=list_rivers)

    cp = sps.add_parser('show', help="Show the feeds in a particular river")
    cp.set_defaults(func=show_river)
    cp.add_argument('name', help="The river name to show", default=None)

    args = parser.parse_args()
    if args.cmd:
        args.func(args)
    else:
        parser.print_usage()
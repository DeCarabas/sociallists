import logging
import time

from sociallists import db, http_util

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
        session = http_util.session()
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
        return time_to_rfc2822(tt)
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
        "feedTitle": feed.feed.get('title', ''),
        "feedUrl": feed.get('href', ''),
        "websiteUrl": feed.feed.get('link', ''),
        "feedDescription": feed.feed.get('subtitle', ''),
        "whenLastUpdate": datetime_to_rfc2822(update_time),
        "item": [
            entry_to_river(e, i, session)
            for e,i in zip(feed.entries, count(start_id))
        ],
    }

def feed_to_river(feed, start_id):
    """Convert a feed object from feedparser to a river.js format"""
    return wrap_feed_updates([feed_to_river_update(feed, start_id)])

def aggregate_river(user, name):
    """Aggregate a set of feed updates for a given river."""
    with db.session() as session:
        db_river = db.load_river_by_name(session, user, name)
        feed_updates = []
        if db_river:
            updates = [
                update for feed in db_river.feeds for update in feed.updates
            ]
            updates.sort(reverse=True, key=lambda u: u.update_time)
            feed_updates = [ db.load_river_update(session, u) for u in updates ]

    return wrap_feed_updates(feed_updates)

def add_river_and_feed(user, river_name, url):
    with db.session() as session:
        feed = db.load_feed_by_url(session, url)
        if not feed:
            logger.info("Feed '{url}' not found in database. Adding.".format(
                url=url,
            ))
            feed = db.add_feed(session, url)

        river = db.load_river_by_name(session, user, river_name)
        if not river:
            logger.info('River {user}/{river} not found, creating.'.format(
                user=user,
                river=river_name,
            ))
            river = db.create_river(session, user, river_name)

        if feed in river.feeds:
            logger.info(
                "Feed '{url}' already in river '{user}/{river}'".format(
                    url=url,
                    user=user,
                    river=river_name,
                )
            )
        else:
            logger.info(
                "Added feed '{url}' to river '{user}/{river}'".format(
                    url=url,
                    user=user,
                    river=river_name,
                )
            )
            river.feeds.append(feed)

        session.commit()

#######################################

def add_feed_cmd(args):
    add_river_and_feed(args.user, args.river, args.url)

def list_rivers_cmd(args):
    with db.session() as session:
        rivers = db.load_rivers_by_user(session, args.user)

    for r in rivers:
        print('{name}'.format(
            name=r.name,
        ))
    print('{count} river(s)'.format(
        count=len(rivers),
    ))

def show_river_cmd(args):
    with db.session() as session:
        river = db.load_river_by_name(session, args.user, args.name)

    for feed in river.feeds:
        print(str(feed))
    print('{count} feeds(s)'.format(
        count=len(river.feeds),
    ))

def import_opml_cmd(args):
    import listparser
    l = listparser.parse(args.file)
    for item in l.feeds:
        rivers = ['Main']
        if len(item.categories) > 0:
            rivers = [('/'.join(c for c in cats)) for cats in item.categories]
        for river_name in rivers:
            print("Importing feed %s to river %s" % (
                item.url,
                river_name,
            ))
            add_river_and_feed(args.user, river_name, item.url)

if __name__=='__main__':
    import argparse

    parser = argparse.ArgumentParser(description="sociallists river related commands")
    parser.add_argument("-u", "--user", help="The user whose list we're modifying", required=True)

    sps = parser.add_subparsers(dest='cmd')

    cp = sps.add_parser('add', help="Add a feed to a user's river")
    cp.set_defaults(func=add_feed_cmd)
    cp.add_argument('river', help="The name of the river to augment")
    cp.add_argument('url', help="The URL to add to the DB")

    cp = sps.add_parser('import', help="Import an OPML file for a user")
    cp.set_defaults(func=import_opml_cmd)
    cp.add_argument('file', help="The file to import")

    cp = sps.add_parser('list', help="List all the user's rivers", aliases=["ls"])
    cp.set_defaults(func=list_rivers_cmd)

    cp = sps.add_parser('show', help="Show the feeds in a particular river")
    cp.set_defaults(func=show_river_cmd)
    cp.add_argument('name', help="The river name to show", default=None)

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

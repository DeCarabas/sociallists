import time
from datetime import datetime
from email import utils
from html.parser import HTMLParser
from itertools import count

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

def entry_to_river(entry, i):
    """Convert a feed entry to a river.js item"""
    # TODO: See if you can pull a thumbnail.
    # TODO: See if you can pull enclosures.
    return {
        "title": entry.get('title', ''),
        "link": entry.get('link', ''),
        "body": convert_description(entry.get('description', '')),
        "pubDate": get_entry_pubDate(entry),
        "permaLink": "",  # Not sure why to populate this, so skipping.
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

def feed_to_river_update(feed, start_id, update_time = None):
    """Convert a feed object from feedparser to a river.js format"""
    if update_time is None:
        update_time = datetime.utcnow()

    return {
        "feedTitle": feed.feed.title,
        "feedUrl": feed.href,
        "websiteUrl": feed.feed.link,
        "feedDescription": feed.feed.subtitle,
        "whenLastUpdate": datetime_to_rfc2822(update_time),
        "item": [entry_to_river(e, i) for e,i in zip(feed.entries, count(start_id))],
    }

def feed_to_river(feed, start_id):
    """Convert a feed object from feedparser to a river.js format"""
    return wrap_feed_updates([feed_to_river_update(feed, start_id)])

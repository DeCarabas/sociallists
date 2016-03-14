import feedparser
import logging
from sociallists import db

logger = logging.getgetLogger('sociallists.feed')

def update_feed(feed):
    logger.info('Updating feed {url}' % { 'url': feed.url })
    f = feedparser.parse(feed.url, feed.etag_header, feed.modified_header)

def update_feeds():
    # TODO: Figure out how to partition this thing so we can have
    # multiple updaters at once.
    feeds = db.session.query(db.FeedData)
    for feed in feeds:
        update_feed(feed)

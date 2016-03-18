import feedparser
import logging

from datetime import datetime
from hashlib import sha1
from sociallists import db, river

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

def update_feed(feed):
    update_time = datetime.utcnow()
    logger.info('Updating feed {url} ({etag}/{modified}) @ {now}'.format(
        url=feed.url,
        etag=feed.etag_header,
        modified=feed.modified_header,
        now=update_time.isoformat(),
    ))
    f = feedparser.parse(feed.url, etag=feed.etag_header, modified=feed.modified_header)
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
        r_new = river.feed_to_river_update(f, feed.next_item_id, update_time)
        feed.next_item_id += len(f.entries)
        db.store_river(feed, update_time, r_new)
        db.store_history(feed, [ e_id[0] for e_id in entries_with_ids ])

    feed.etag_header = f.get('etag', None)
    feed.modified_header = f.get('modified', None)
    db.session.commit()

    logger.info('Successfully updated feed {url}'.format(url=feed.url))

def update_feeds():
    # TODO: Figure out how to partition this thing so we can have
    # multiple updaters at once.
    feeds = db.load_all_feeds()
    for feed in feeds:
        update_feed(feed)


if __name__=='__main__':
    logging.basicConfig(format='%(asctime)s %(message)s', level=logging.INFO)
    update_feeds()

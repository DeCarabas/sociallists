import logging
import time

from greplin import scales

logger = logging.getLogger('sociallists.events')

STATS = scales.collection(
    '/sociallists',
    scales.PmfStat('feed_update'),

    scales.IntStat('thumbnail_fetched_from_summary'),
    scales.IntStat('thumbnail_fetched_from_content'),
    scales.IntStat('thumbnail_fetched_from_link'),
    scales.IntStat('thumbnail_fetched_not_found'),

    scales.IntStat('thumbnail_is_direct'),
    scales.IntStat('thumbnail_is_open_graph'),
    scales.IntStat('thumbnail_is_link_rel'),
    scales.IntStat('thumbnail_is_not_supported'),
    scales.IntStat('thumbnail_is_img_tag'),
)

def log_stats():
    thumbnail_total = (
        STATS.thumbnail_fetched_from_link +
        STATS.thumbnail_fetched_not_found +
        STATS.thumbnail_fetched_from_content +
        STATS.thumbnail_fetched_from_summary
    )
    logger.info('Thumbnails from summary: {c}/{t}'.format(
        c=STATS.thumbnail_fetched_from_summary,
        t=thumbnail_total
    ))
    logger.info('Thumbnails from content: {c}/{t}'.format(
        c=STATS.thumbnail_fetched_from_content,
        t=thumbnail_total,
    ))
    logger.info('Thumbnails from link:    {c}/{t}'.format(
        c=STATS.thumbnail_fetched_from_link,
        t=thumbnail_total,
    ))

def feed_update_measure(feed_url):
    return STATS.feed_update.time()

def thumbnail_fetched_from_summary(entry):
    STATS.thumbnail_fetched_from_summary += 1

def thumbnail_fetched_from_content(entry):
    STATS.thumbnail_fetched_from_content += 1

def thumbnail_fetched_from_link(entry):
    STATS.thumbnail_fetched_from_link += 1

def thumbnail_fetched_not_found(entry):
    STATS.thumbnail_fetched_not_found += 1

def thumbnail_is_direct(url):
    logger.info('{url} is an image'.format(url=url))
    STATS.thumbnail_is_direct += 1

def thumbnail_is_open_graph(url):
    logger.info('{url} using opengraph image content URL (2)'.format(url=url))
    STATS.thumbnail_is_open_graph += 1

def thumbnail_is_link_rel(url):
    logger.info('{url} using thumbnail link rel'.format(url=url))
    STATS.thumbnail_is_link_rel += 1

def thumbnail_is_not_supported(url):
    logger.info('{url} is an unsupported type'.format(url=url))
    STATS.thumbnail_is_not_supported += 1

def thumbnail_is_img_tag(url):
    STATS.thumbnail_is_img_tag += 1

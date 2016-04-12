from sociallists import http_util, river

import feedparser

from betamax import Betamax
from hypothesis import given
from hypothesis.strategies import text

@given(description=text())
def test_convert_description_is_small(description):
    assert len(river.convert_description(description)) <= 280

def test_feed_to_river_all_entries_matched():
    with Betamax(http_util.session()).use_cassette(
        'test_feed_to_river_all_entries_matched'
    ):
        http_session = http_util.session()
        response = http_session.get('http://www.forbes.com/news/index.xml')
        f = feedparser.parse(http_util.FeedparserShim(response))
        r = river.feed_to_river_update(f, 0)
        assert len(f.entries) > 0
        assert len(r['item']) == len(f.entries)

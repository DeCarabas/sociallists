from sociallists import river

import feedparser

from hypothesis import given
from hypothesis.strategies import text

@given(description=text())
def test_convert_description_is_small(description):
    assert len(river.convert_description(description)) <= 280

def test_feed_to_river_all_entries_matched():
    f = feedparser.parse('http://www.forbes.com/news/index.xml')
    r = river.feed_to_river(f, 0)
    assert len(f.entries) > 0
    assert len(r['item']) == len(f.entries)

import pytest

from betamax import Betamax
from sociallists import db, feed, http_util

def test_feed_rename_works(db_session):
    with Betamax(http_util.session()).use_cassette('test_feed_rename_works'):
        f = db.add_feed(db_session, 'http://trixter.oldskool.org/feed/')
        feed.do_update_feed(db_session, f)
        assert f.url == 'https://trixter.oldskool.org/feed/'

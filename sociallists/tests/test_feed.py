from sociallists import db, feed, http_util

from betamax import Betamax
from sqlalchemy.engine import create_engine
from sqlalchemy.orm.session import Session

import pytest

@pytest.fixture(scope="session")
def db_session(request):
    engine = create_engine('sqlite://')
    connection = engine.connect()
    db.Base.metadata.create_all(connection)

    def fin_db():
        connection.close()
        engine.dispose()
    request.addfinalizer(fin_db)

    return Session(connection)

def test_feed_rename_works(db_session):
    with Betamax(http_util.session()).use_cassette('test_feed_rename_works'):
        f = db.add_feed(db_session, 'http://trixter.oldskool.org/feed/')
        feed.do_update_feed(db_session, f)
        assert f.url == 'https://trixter.oldskool.org/feed/'

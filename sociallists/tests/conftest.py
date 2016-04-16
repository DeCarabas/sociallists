import logging
import os
import pytest

from betamax import Betamax
from sociallists import db
from sqlalchemy.engine import create_engine
from sqlalchemy.orm.session import Session

@pytest.fixture
def data_dir(request):
    filename = request.module.__file__
    return os.path.dirname(filename)

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

with Betamax.configure() as config:
    config.cassette_library_dir = 'cassettes'

logging.basicConfig(
    format='%(asctime)s %(message)s',
    level=logging.DEBUG,
)

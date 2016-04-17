import logging
import os
import pytest
import shutil

from betamax import Betamax
from sociallists import db
from sqlalchemy.engine import create_engine
from sqlalchemy.orm.session import Session

class TestDataDir(object):
    """A dictionary-like object that provides copy-on-read access to data
    directories.
    """
    def __init__(self, global_dir, module_dir, tmp_dir):
        self.global_dir = global_dir
        self.module_dir = module_dir
        self.tmpdir = tmp_dir
        assert (
            os.path.isdir(self.module_dir) or
            os.path.isdir(self.global_dir)
        ), 'neither {global_d} or {module_d} are valid data directories'.format(
            global_d=self.global_dir,
            module_d=self.module_dir,
        )

    def __getitem__(self, filename):
        module_srcpath = os.path.join(self.module_dir, filename)
        global_srcpath = os.path.join(self.global_dir, filename)
        temppath = os.path.join(self.tmpdir, filename)
        if os.path.isfile(module_srcpath):
            shutil.copy(module_srcpath, temppath)
        elif os.path.isfile(global_srcpath):
            shutil.copy(global_srcpath, temppath)
        return temppath

    def read(self, filename, mode=''):
        with open(self[filename], 'r'+mode) as fp:
            return fp.read()

@pytest.fixture
def data_dir(request, tmpdir):
    """Provides a dictionary-like object that can be used to look up full paths
    to files in test directories.

    The files are copy-on-access, so you don't have to worry about accidentally
    modifying them.
    """
    base_dir = request.fspath.dirname
    module_dir = os.path.join(
        base_dir,
        os.path.splitext(request.module.__name__)[1][1:]
    )
    global_dir = os.path.join(base_dir, 'data')
    test_data_dir = TestDataDir(global_dir, module_dir, tmpdir.strpath)
    return test_data_dir

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
    config.preserve_exact_body_bytes = True

logging.basicConfig(
    format='%(asctime)s %(message)s',
    level=logging.DEBUG,
)

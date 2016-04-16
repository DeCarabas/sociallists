import logging
import os
import pytest

from betamax import Betamax

@pytest.fixture
def data_dir(request):
    filename = request.module.__file__
    return os.path.dirname(filename)

with Betamax.configure() as config:
    config.cassette_library_dir = 'cassettes'

logging.basicConfig(
    format='%(asctime)s %(message)s',
    level=logging.DEBUG,
)

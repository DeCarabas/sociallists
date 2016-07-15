import logging

from sociallists.app import app
from sociallists.db import Base, engine

level = logging.INFO
logging.basicConfig(
    format='%(asctime)s %(message)s',
    level=level,
)

# TODO: Config
Base.metadata.create_all(engine)
app.run(debug=True)

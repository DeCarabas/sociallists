import logging

from sociallists.app import app

level = logging.INFO
logging.basicConfig(
    format='%(asctime)s %(message)s',
    level=level,
)

# TODO: Config
app.run(debug=True)

import feedparser
import json

from flask import Flask, render_template
from sociallists.river import feed_to_river
from sociallists import db

app = Flask('sociallists')

@app.route("/api/v1/river/<id>")
def get_river(id):
    feed = feedparser.parse("http://davepeck.org/feed/")

    river = feed_to_river(feed, 0)

    # TODO: jsonp serialize
    result = "onGetRiverStream("+json.dumps(river, indent=2, sort_keys=True)+");"
    return (result, 200, {'content-type': 'application/javascript'})

@app.route("/api/v1/feed/<id>")
def get_feed_river(id):
    river = db.load_river("http://davepeck.org/feed/")

    # TODO: jsonp serialize
    result = "onGetRiverStream("+json.dumps(river, indent=2, sort_keys=True)+");"
    return (result, 200, {'content-type': 'application/javascript'})

@app.route("/")
def index():
    return render_template('index.html')

@app.teardown_request
def shutdown_session(exception=None):
    db.session.remove()

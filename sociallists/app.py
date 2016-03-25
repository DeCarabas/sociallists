import feedparser
import json

from flask import Flask, render_template
from sociallists.river import feed_to_river
from sociallists import db, river

app = Flask('sociallists')

@app.route("/api/v1/river/<user>/<id>")
def get_river(user,id):
    db_river = db.load_river_by_name(user,id)
    feed_updates = []
    if db_river:
        updates = [
            update for feed in db_river.feeds for update in feed.updates
        ]
        updates.sort(reverse=True, key=lambda u: u.update_time)
        feed_updates = [ json.loads(u.data) for u in updates ]

    r = river.wrap_feed_updates(feed_updates)
    result = "onGetRiverStream("+json.dumps(r, indent=2, sort_keys=True)+");"
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

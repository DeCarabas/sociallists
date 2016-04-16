import feedparser
import json

from flask import abort, Flask, g, render_template, request, url_for
from sociallists.river import feed_to_river
from sociallists import db, river

app = Flask('sociallists')

@app.route("/")
def index():
    g.is_debug = app.debug
    return render_template('index.html')

@app.route("/api/v1/river/<user>")
def get_river_list(user):
    with db.session() as session:
        rivers = db.load_rivers_by_user(session, user)
        result = json.dumps({
            'rivers': [
                {
                    'name':r.name,
                    'url':url_for('get_river', user=user, id=r.name),
                }
                for r in rivers
            ]
        }, indent=2, sort_keys=True)

    return (result, 200, {'content-type': 'application/javascript'})

@app.route("/api/v1/river/<user>/<id>")
def get_river(user,id):
    r = river.aggregate_river(user,id)
    result = json.dumps(r, indent=2, sort_keys=True)
    return (result, 200, {'content-type': 'application/json'})

@app.route("/api/v1/river/<user>/<id>/public")
def get_public_river(user,id):
    r = river.aggregate_river(user,id)
    result = "onGetRiverStream("+json.dumps(r, indent=2, sort_keys=True)+");"
    return (result, 200, {'content-type': 'application/javascript'})

@app.route("/blob/<hash>")
def get_blob(hash):
    # Check the etag here; if it matches the hash then you've already got it
    if request.if_none_match == hash:
        abort(304)
    with db.session() as db_session:
        blob = db.get_blob(db_session, hash)
        if blob is None:
            abort(404)
        return (blob.data, 200, {
            'content-type': blob.contentType,
            'ETag': hash,
        })

@app.teardown_request
def shutdown_session(exception=None):
    db.global_session.remove()

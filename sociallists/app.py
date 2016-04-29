import feedparser
import json
import threading

from flask import abort, Flask, g, render_template, request, url_for, Response
from sociallists.river import feed_to_river
from sociallists import db, feed, river

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
                    'url':url_for('get_or_post_river', user=user, id=r.name),
                }
                for r in rivers
            ]
        }, indent=2, sort_keys=True)

    return (result, 200, {'content-type': 'application/javascript'})

def rewrite_river(r):
    for u in r['updatedFeeds']['updatedFeed']:
        for item in u['item']:
            thumb = item.get('thumbnail')
            if thumb is not None:
                h = thumb.get('__blob')
                if h is not None:
                    thumb['url'] = url_for('get_blob', hash=thumb['__blob'])
                    del thumb['__blob']
    return r

def get_river(user, id):
    r = rewrite_river(river.aggregate_river(user,id))
    result = json.dumps(r, indent=2, sort_keys=True)
    return (result, 200, {'content-type': 'application/json'})

def post_river(user, id):
    request_data = request.get_json(force=True)
    feed_url = river.add_river_and_feed(user, id, request_data['url'])
    with db.session() as session:
        f = db.load_feed_by_url(session, feed_url)
        if not f.next_item_id:
            feed.do_update_feed(session, f)
            session.commit()
    return (json.dumps({'status': 'ok'}), 200)

@app.route("/api/v1/river/<user>/<id>", methods=['GET', 'POST'])
def get_or_post_river(user,id):
    if request.method == 'GET':
        return get_river(user, id)
    else:
        return post_river(user, id)

@app.route("/api/v1/river/<user>/<id>/public")
def get_public_river(user,id):
    r = rewrite_river(river.aggregate_river(user,id))
    result = "onGetRiverStream("+json.dumps(r, indent=2, sort_keys=True)+");"
    return (result, 200, {'content-type': 'application/javascript'})

@app.route("/api/v1/river/<user>/refresh_all", methods=['POST'])
def post_refresh_rivers(user):
    with db.session() as db_session:
        all_feeds = db.load_all_feeds(db_session)
    done_feeds = []
    done_feeds_condition = threading.Condition()

    def update_progress(feed):
        with done_feeds_condition:
            done_feeds.append(feed)
            done_feeds_condition.notify()

    def progress_generator():
        with done_feeds_condition:
            while len(done_feeds) != len(all_feeds):
                pct = int(100 * len(done_feeds) / len(all_feeds))
                yield str(pct)+'\n'
                done_feeds_condition.wait()
        yield '100\n'

    def update_main_thread():
        batch = feed.FeedUpdateBatch()
        batch.update_feeds(all_feeds, sync=False, done_callback=update_progress)

    threading.Thread(target=update_main_thread).start()
    return Response(progress_generator(), mimetype='text/plain')


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

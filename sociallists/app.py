import feedparser

from flask import Flask, render_template
from sociallists.river import feed_to_river

app = Flask('sociallists')

@app.route("/api/v1/river/<id>")
def get_river(id):
    feed = feedparser.parse("http://davepeck.org/feed/")

    updatedFeeds = {
        "updatedFeed": [ feed_to_river(feed) ],
    }

    metadata = {}

    river = {
        'updatedFeeds': updatedFeeds,
        'metadata': metadata,
    }

    # TODO: jsonp serialize

@app.route("/")
def index():
    return render_template('index.html')

import json
import os

from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import scoped_session, sessionmaker, relationship
from sqlalchemy.schema import Column, ForeignKey
from sqlalchemy.types import DateTime, Integer, Unicode, UnicodeText, BigInteger

from sociallists import river

engine = create_engine(os.environ.get('DB_CONNECTION_STRING', "postgresql:///sociallists"))
session = scoped_session(sessionmaker(bind=engine, autoflush=False))

Base = declarative_base(bind=engine)

class RiverUpdateData(Base):
    __tablename__ = 'river_updates'

    id = Column(Integer, primary_key=True, nullable=False)
    feed_id = Column(Integer, ForeignKey("feeds.id"))
    update_time = Column(DateTime, nullable=False)
    data = Column(UnicodeText, nullable=False)

    def __init__(self, **kwargs):
        kwargs.setdefault('update_time', datetime.utcnow())
        super(RiverUpdateData, self).__init__(**kwargs)

    def __repr__(self):
        return "<RiverUpdateData(id=%d, feed=%d, time='%s')>" % (
            self.id,
            self.feed_id,
            self.update_time,
        )


class FeedData(Base):
    __tablename__ = 'feeds'

    id = Column(Integer, primary_key=True, nullable=False)
    url = Column(Unicode, nullable=False, unique=True, index=True)
    etag_header = Column(Unicode, nullable=True)
    modified_header = Column(Unicode, nullable=True)
    last_status = Column(Integer, nullable=False)
    title = Column(Unicode, nullable=True)
    site_url = Column(Unicode, nullable=True)
    description = Column(Unicode, nullable=True)
    next_item_id = Column(BigInteger, nullable=False)
    history = Column(UnicodeText, nullable=False)

    updates = relationship(
        "RiverUpdateData",
        order_by=RiverUpdateData.update_time.desc(),
    )

    def __init__(self, **kwargs):
        kwargs.setdefault('last_status', 0)
        kwargs.setdefault('history', '')
        kwargs.setdefault('next_item_id', 0)
        super(FeedData, self).__init__(**kwargs)

    def __repr__(self):
        return "<FeedData(id=%d, url='%s')>" % (self.id, self.url)

    def reset(self):
        self.etag_header = None
        self.modified_header = None
        self.last_status = 0
        self.history = ''
        self.updates = []
        self.next_item_id = 0


def add_feed(url):
    feed = FeedData(url=url, last_status=0, next_item_id=0, history='')
    session.add(feed)
    session.commit()

def load_all_feeds():
    """Load all of the FeedData from the DB"""
    return session.query(FeedData).all()

def load_history_set(feed):
    history = []
    if len(feed.history) > 0:
        history = json.loads(feed.history)
    return set(history)

def store_history(feed, history):
    feed.history = json.dumps(list(history))

def load_river(url):
    """Load a river structure for the given FeedData"""
    # TODO: Normalize url?
    feed = (
        session.query(FeedData)
        .filter(FeedData.url == url)
        .first()
    )

    return river.wrap_feed_updates(
        [ json.loads(u.data) for u in feed.updates ]
    )

def store_river(feed, update_time, river):
    """Store a river structure for the given FeedData"""
    data = RiverUpdateData(
        feed_id = feed.id,
        update_time = update_time,
        data = json.dumps(river),
    )
    session.add(data)

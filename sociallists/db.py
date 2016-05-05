import hashlib
import json
import logging
import os

from contextlib import contextmanager
from datetime import datetime
from sqlalchemy import create_engine, Table, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import scoped_session, sessionmaker, relationship
from sqlalchemy.schema import Column, ForeignKey
from sqlalchemy.types import (
    DateTime,
    Integer,
    LargeBinary,
    String,
    Unicode,
    UnicodeText,
    BigInteger,
)

logger = logging.getLogger('sociallists.db')

engine = create_engine(os.environ.get('DB_CONNECTION_STRING', "postgresql:///sociallists"))
session_maker = sessionmaker(bind=engine, autoflush=False)
global_session = scoped_session(session_maker)

Base = declarative_base(bind=engine)

river_feeds = Table('river_feeds', Base.metadata,
    Column('river_id', ForeignKey('rivers.id'), primary_key=True),
    Column('feed_id', ForeignKey('feeds.id'), primary_key=True),
)

class BlobData(Base):
    __tablename__ = 'blobs'
    __table_args__ = (
        UniqueConstraint('hash'),
    )

    id = Column(Integer, primary_key=True, nullable=False)
    hash = Column(String(64))
    contentType = Column(String)
    data = Column(LargeBinary)

class RiverData(Base):
    __tablename__ = 'rivers'
    __table_args__ = (
        UniqueConstraint('user_id', 'name'),
    )

    id = Column(Integer, primary_key=True, nullable=False)
    user_id = Column(Unicode, nullable=False, index=True)
    name = Column(Unicode, nullable=False)
    mode = Column(Unicode, nullable=True)

    feeds = relationship('FeedData', secondary=river_feeds)

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

    def __str__(self):
        return '{url} ({etag}/{modified}/{status})'.format(
            url=self.url,
            etag=self.etag_header,
            modified=self.modified_header,
            status=self.last_status,
        )

    def reset(self):
        self.etag_header = None
        self.modified_header = None
        self.last_status = 0
        self.history = ''
        self.updates = []
        self.next_item_id = 0


@contextmanager
def session():
    session = session_maker()
    try:
        yield session
    finally:
        session.close()

def add_feed(session, url):
    feed = FeedData(url=url, last_status=0, next_item_id=0, history='')
    session.add(feed)
    return feed

def load_all_feeds(session):
    """Load all of the FeedData from the DB"""
    return session.query(FeedData).all()

def load_feed_by_url(session, url):
    """Load a single feed by URL"""
    return session.query(FeedData).filter(FeedData.url == url).first()

def load_history_set(session, feed):
    history = []
    if len(feed.history) > 0:
        history = json.loads(feed.history)

    return set(history)

def store_history(session, feed, history):
    feed.history = json.dumps(list(history))

def load_river_update(session, update):
    """Decode the river update structure in the update object"""
    return json.loads(update.data)

def store_river(session, feed, update_time, river):
    """Store a river structure for the given FeedData"""
    data = RiverUpdateData(
        feed_id = feed.id,
        update_time = update_time,
        data = json.dumps(river),
    )
    session.add(data)
    return data

def load_river_by_name(session, user, river_name):
    """Load a RiverData object by user ID and name"""
    return (
        session.query(RiverData)
        .filter(RiverData.user_id == user)
        .filter(RiverData.name == river_name)
        .one_or_none()
    )

def load_rivers_by_feed(session, feed):
    return (
        session.query(RiverData)
        .filter(RiverData.feeds.contains(feed))
        .all()
    )

def create_river(session, user, river_name):
    data = RiverData(user_id=user, name=river_name)
    session.add(data)
    return data

def load_rivers_by_user(session, user):
    """Load all the RiverData objects for a given user id."""
    return (
        session.query(RiverData).filter(RiverData.user_id == user).all()
    )

def get_blob(session, h):
    return session.query(BlobData).filter(BlobData.hash == h).one_or_none()

def store_blob(session, content_type, data):
    h = hashlib.sha256(data).hexdigest()
    blob = get_blob(session, h)
    if blob is None:
        blob = BlobData(hash=h, contentType=content_type, data=data)
        session.add(blob)
    elif blob.contentType != content_type:
        blob.contentType = content_type
        session.add(blob)
    return blob

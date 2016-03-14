import os

from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.schema import Column
from sqlalchemy.types import DateTime, Integer, Unicode

engine = create_engine(os.environ.get('DB_CONNECTION_STRING', "postgresql:///sociallists"))
session = scoped_session(sessionmaker(bind=engine, autoflush=False))

Base = declarative_base(bind=engine)

class FeedData(Base):
    __tablename__ = 'feeds'

    id = Column(Integer, primary_key=True, nullable=False)
    url = Column(Unicode, nullable=False)
    etag_header = Column(Unicode, nullable=True)
    modified_header = Column(Unicode, nullable=True)
    last_status = Column(Integer, nullable=False)
    title = Column(Unicode, nullable=True)
    site_url = Column(Unicode, nullable=True)
    description = Column(Unicode, nullable=True)

    def __init__(self, **kwargs):
        kwargs.setdefault('last_status', 0)
        super(FeedData, self).__init__(**kwargs)

class RiverItemData(Base):
    __tablename__ = 'river_items'

    id = Column(Integer, primary_key=True, nullable=False)
    update_id = Column(Integer, nullable=False)
    title = Column(Unicode, nullable=True)
    link = Column(Unicode, nullable=True)
    body = Column(Unicode, nullable=True)
    pubDate = Column(DateTime, nullable=True)
    permaLink = Column(Unicode, nullable=True)
    comments = Column(Unicode, nullable=True)
    enclosure_url = Column(Unicode, nullable=True)
    enclosure_type = Column(Unicode, nullable=True)
    enclosure_length = Column(Integer, nullable=True)
    thumbnail_url = Column(Unicode, nullable=True)
    thumbnail_width = Column(Integer, nullable=True)
    thumbnail_height = Column(Integer, nullable=True)

class RiverUpdateData(Base)
    __tablename__ = 'river_updates'

    id = Column(Integer, primary_key=True, nullable=False)
    feed_id = Column(Integer, nullable=False)
    update_time = Column(DateTime, nullable=False)

    def __init__(self, **kwargs):
        kwargs.setdefault('update_time', datetime.utcnow())
        super(RiverUpdates, self).__init__(**kwargs)

from sociallists import http_util, db

from hypothesis import given
from hypothesis.strategies import binary, text

@given(blob=binary(), content_type=text())
def test_blob_storage_stores_blobs(db_session, content_type, blob):
    assert db.store_blob(db_session, content_type, blob).data == blob

@given(blob=binary(), content_type=text())
def test_blob_storage_stores_content_type(db_session, content_type, blob):
    act = db.store_blob(db_session, content_type, blob).contentType
    assert act == content_type

@given(blob=binary(), content_type=text())
def test_blob_storage_stores_round_trip_content(db_session, content_type, blob):
    b1 = db.store_blob(db_session, content_type, blob)
    db_session.commit()

    b2 = db.get_blob(db_session, b1.hash)
    assert b1 == b2

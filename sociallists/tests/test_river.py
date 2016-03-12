from sociallists import river

from hypothesis import given
from hypothesis.strategies import text

@given(description=text())
def test_convert_description_is_small(description):
    assert len(river.convert_description(description)) <= 280

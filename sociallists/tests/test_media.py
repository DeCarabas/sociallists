from sociallists import http_util, media

import io
from betamax import Betamax

import pytest

images = [
    ('https://www.crummy.com/software/BeautifulSoup',     'beautiful_soup.png'),
    ('http://whatever.scalzi.com/2016/04/15/zeus-41516/', 'zeus.png'),
]

@pytest.mark.parametrize('url,expected', images)
def test_get_url_image(data_dir, url, expected):
    http_session = http_util.session()
    expected_img_data = data_dir.read(expected, 'b')

    # Can't use Betamax because it has a bug.
    # with Betamax(http_session).use_cassette('test_get_url_image'):
    actual_img = media.get_url_image(
        url=url,
        size=(128,128),
        http_session=http_session,
    )
    assert actual_img is not None
    assert actual_img.size[0] == 128
    assert actual_img.size[1] == 128

    stream = io.BytesIO()
    actual_img.save(stream, "PNG")
    assert expected_img_data == stream.getbuffer()

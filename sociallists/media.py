import io
import functools
import logging
import math
import urllib.parse

from bs4 import BeautifulSoup
from PIL import Image, ImageFile
from sociallists import db, events, http_util

logger = logging.getLogger('sociallists.feed')

_BEAUTIFUL_PARSER = "html.parser"

def get_url_image(url, size, http_session=None):
    """Compute the appropriate image for the given URL, or None if there is no
    image.
    """
    try:
        if http_session is None:
            http_session = http_util.session()

        logger.info('{url} Fetching image...'.format(url=url))
        thumbnail_url, image_data = _find_thumbnail_image(url, http_session)
        if thumbnail_url:
            thumbnail_url = urllib.parse.urljoin(url, thumbnail_url)
            logger.info('{url} thumbnail is {thumbnail_url}'.format(
                url=url, thumbnail_url=thumbnail_url,
            ))
            if not image_data:
                logger.info(
                    '{url} Fetching image data @ {thumbnail_url}'.format(
                        url=url,
                        thumbnail_url=thumbnail_url,
                    ))
                _, _, image_data = _fetch_url(
                    thumbnail_url, http_session, referer=url)

        return _prepare_image(image_data, size) if image_data else None
    except IOError:
        return None

def get_html_image(url, html_string, size, http_session=None):
    try:
        if http_session is None:
            http_session = http_util.session()

        logger.info('{url} Fetching image...'.format(url=url))
        image_data = None
        soup = BeautifulSoup(html_string, _BEAUTIFUL_PARSER)
        thumbnail_url = _find_thumbnail_url_from_soup(url, soup, http_session)
        if thumbnail_url:
            thumbnail_url = urllib.parse.urljoin(url, thumbnail_url)
            logger.info('{url} thumbnail is {thumbnail_url}'.format(
                url=url, thumbnail_url=thumbnail_url,
            ))
            logger.info(
                '{url} Fetching image data @ {thumbnail_url}'.format(
                    url=url,
                    thumbnail_url=thumbnail_url,
                ))
            _, _, image_data = _fetch_url(
                thumbnail_url, http_session, referer=url)

        return _prepare_image(image_data, size) if image_data else None
    except IOError:
        return None

def _fetch_url(url, http_session, referer=None):
    """Fetch data from the specified URL and return (url, content-type, data)
    tuple.
    """
    response = http_session.get(url, headers={'Referer': referer})
    result = (response.url, response.headers['Content-Type'], response.content)
    logger.info('{url} Fetched {r_url}, {content_type}, {length} bytes'.format(
        url=url, r_url=result[0], content_type=result[1], length=len(result[2])
    ))
    return result

def _image_entropy(img):
    """Calculate the entropy of an image."""
    hist = img.histogram()
    hist_size = sum(hist)
    hist = [float(h) / hist_size for h in hist]

    return -sum(p * math.log(p, 2) for p in hist if p != 0)

def _crop_image_vertically(img, target_height):
    """Crop image vertically to the specified height."""
    x,y = img.size
    while y > target_height:
        #slice 10px at a time until square
        slice_height = min(y - target_height, 10)

        bottom = img.crop((0, y - slice_height, x, y))
        top = img.crop((0, 0, x, slice_height))

        #remove the slice with the least entropy
        if _image_entropy(bottom) < _image_entropy(top):
            img = img.crop((0, 0, x, y - slice_height))
        else:
            img = img.crop((0, slice_height, x, y))

        x,y = img.size
    return img

def _crop_image_horizontally(img, target_width):
    """Crop image horizontally to the specified width."""
    width,height = img.size
    while width > target_width:
        slice_width = min(width - target_width, 10)
        left = img.crop((0, 0, slice_width, height))
        right = img.crop((width - slice_width, 0, width, height))

        if _image_entropy(left) < _image_entropy(right):
            img = img.crop((slice_width, 0, width, height))
        else:
            img = img.crop((0, 0, width - slice_width, height))

        width, height = img.size
    return img

def _square_image(img):
    """Make the image square, hopefully in a good way."""
    width, height = img.size
    if width > height:
        return _crop_image_horizontally(img, target_width=height)
    else:
        return _crop_image_vertically(img, target_height=width)

def _load_image(image_data):
    """Load the image from the image data using PILLOW or not."""
    return Image.open(io.BytesIO(image_data))

def _prepare_image(image_data, size):
    image = _load_image(image_data)
    image = _square_image(image)
    image.thumbnail(size, Image.ANTIALIAS)
    return image

def _extract_open_graph_url(url, soup):
    """Extract the thumbnail URL using the Open Graph protocol (http://ogp.me/)
    """
    og_image = (soup.find('meta', property='og:image') or
                soup.find('meta', attrs={'name': 'og:image'}))
    if og_image and og_image.get('content'):
        return og_image['content']

    og_image = (soup.find('meta', property='og:image:url') or
                soup.find('meta', attrs={'name': 'og:image:url'}))
    if og_image and og_image.get('content'):
        return og_image['content']

    return None

def _extract_twitter_image_url(url, soup):
    tw_image = (soup.find('meta', property='twitter:image') or
                soup.find('meta', attrs={'name': 'twitter:image'}))
    if tw_image and tw_image.get('content'):
        return tw_image['content']

    return None

def _extract_known_goodness(url, soup):
    section = soup.find('section', attrs={'class': 'comic-art'})
    if section and section.img:
        return section.img['src']

    return None

def _should_ignore_image_url(url):
    if url.endswith('addgoogle2.gif'):
        return True

    netloc = urllib.parse.urlparse(url)[1]
    if netloc.endswith('gravatar.com'):
        return True
    if netloc.endswith('googleadservices.com'):
        return True
    if netloc.endswith('doubleclick.net'):
        return True
    if netloc.endswith('amazon-adsystem.com'):
        return True
    return False

def _extract_image_urls(url, soup):
    for img in soup.findAll("img", src=True):
        image_url = img["src"]
        if not _should_ignore_image_url(image_url):
            yield urllib.parse.urljoin(url, image_url)

@functools.lru_cache(maxsize=4096)
def _fetch_image_size(url, http_session, referer):
    """Return the size of an image by URL downloading as little as possible."""
    parser = ImageFile.Parser()
    response = http_session.get(url, headers={'Referer':referer}, stream=True)
    # TODO: Error handling
    for block in response.iter_content(chunk_size=1024):
        logger.debug('{url} {l}'.format(url=url,l=len(block)))
        parser.feed(block)
        if parser.image:
            logger.debug('{url} OK'.format(url=url))
            return parser.image.size
    return None

def _find_thumbnail_url_from_soup(url, soup, http_session):
    """Find the thumbnail url given a beautiful soup."""
    thumbnail_url = _extract_open_graph_url(url, soup)
    if thumbnail_url is not None:
        events.thumbnail_is_open_graph(url)
        return thumbnail_url

    thumbnail_url = _extract_twitter_image_url(url, soup)
    if thumbnail_url is not None:
        events.thumbnail_is_twitter(url)
        return thumbnail_url

    # <link rel="image_src" href="http://...">
    thumbnail_spec = soup.find('link', rel='image_src')
    if thumbnail_spec and thumbnail_spec['href']:
        events.thumbnail_is_link_rel(url)
        return thumbnail_spec['href']

    # Look for magic that doty has programmed explicitly
    thumbnail_url = _extract_known_goodness(url, soup)
    if thumbnail_url:
        events.thumbnail_is_known_goodness(url)
        return thumbnail_url

    # ok, we have no guidance from the author. look for the largest
    # image on the page with a few caveats. (see below)
    logger.info('{url} Searching HTML for images...'.format(url=url))
    max_area = 0
    max_url = None
    for image_url in _extract_image_urls(url, soup):
        logger.debug('{url} Considering {image_url}'.format(
            url=url, image_url=image_url))
        size = _fetch_image_size(image_url, http_session, referer=url)
        if not size:
            logger.debug('{url} {image_url} has no size'.format(
                url=url, image_url=image_url))
            continue

        area = size[0] * size[1]

        # ignore little images
        if area < 5000:
            logger.debug('{url} {image_url} is too small'.format(
                url=url, image_url=image_url))
            continue

        # ignore excessively long/wide images
        ratio = max(size) / min(size)
        if ratio > 2.25:
            logger.debug('{url} {image_url} is too oblong ({ratio})'.format(
                url=url, image_url=image_url, ratio=ratio))
            continue

        # penalize images with "sprite" in their name
        if 'sprite' in image_url.lower():
            area /= 10

        logger.debug('{url} {image_url} has area {area}'.format(
            url=url, image_url=image_url, area=area))
        if area > max_area:
            max_area = area
            max_url = image_url

    if max_url is not None:
        events.thumbnail_is_img_tag(url)
    return max_url

def _find_thumbnail_image(url, http_session):
    """Find what we think is the best thumbnail image for a link.

    Returns a 2-tuple of image url and, as an optimization, the raw image
    data.  A value of None for the former means we couldn't find an image;
    None for the latter just means we haven't already fetched the image.
    """
    url, content_type, content = _fetch_url(url, http_session)

    # if it's an image, it's pretty easy to guess what we should thumbnail.
    if content_type and "image" in content_type and content:
        events.thumbnail_is_direct(url)
        return url, content

    if content_type and "html" in content_type and content:
        soup = BeautifulSoup(content, _BEAUTIFUL_PARSER)
        return _find_thumbnail_url_from_soup(url, soup, http_session), None

    events.thumbnail_is_not_supported(url)
    return None, None

if __name__=='__main__':
    logging.basicConfig(
        format='%(asctime)s %(message)s',
        level=logging.DEBUG,
    )

    import sys
    img = get_url_image(sys.argv[1], (400, 400))
    if img is None:
        logger.error('No image found.')
    else:
        img.save('foo.png')

import requests

s = requests.Session()
a = requests.adapters.HTTPAdapter(max_retries=3)
s.mount('http://', a)
s.mount('https://', a)

class FeedparserShim(object):
    """Map a requests Response object to one feedparser can use directly."""
    def __init__(self, response):
        self.response = response

        self.headers = response.headers
        self.url = response.url
        self.status = response.status_code
        self.code = response.status_code

    def read(self):
        return self.response.content

    def close(self):
        self.response.close()

def session():
    return s

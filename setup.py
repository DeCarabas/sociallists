from setuptools import setup

setup(
    name='Sociallists',
    version='1.0',
    long_description=__doc__,
    packages=['sociallists'],
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        'feedparser==5.2.1',
        'Flask==0.10.1',
        'psycopg2==2.6.1',
        'requests==2.9.1',
        'sgmllib3k==1.0.0',
        'SQLAlchemy==1.0.12',
    ]
)

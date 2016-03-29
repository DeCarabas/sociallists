@echo off
pushd %~dp0\..

SET DB_CONNECTION_STRING=postgresql:///sociallists

SET PYTHONPATH=.
python -m sociallists
SET PYTHONPATH=

popd

@echo off
pushd %~dp0\..
python -m sociallists.feed %*
popd

.PHONY: all build build-js test start watch

all: build test

build: build-js

test:
	python -m pytest sociallists

##### JS Build (::le sigh::)

SCRIPT_DIR=./sociallists/static/scripts
WEBPACK_OUTPUT=bundle.js
WEBPACK_ENTRY=$(SCRIPT_DIR)/main.js
WEBPACK_INPUT=\
	$(WEBPACK_ENTRY)   \

WEBPACK_ARGS=--output-path $(SCRIPT_DIR) --output-filename $(WEBPACK_OUTPUT) --entry $(WEBPACK_ENTRY) --target electron

build-js: $(SCRIPT_DIR)/$(WEBPACK_OUTPUT)

$(SCRIPT_DIR)/$(WEBPACK_OUTPUT): $(WEBPACK_INPUT)
	webpack -d $(WEBPACK_ARGS)

# Rebuild the local javascript over and over and over; for interactive work
# on the client-side JS.
watch:
	webpack -d --watch $(WEBPACK_ARGS)

# Start the local HTTP server
start: export DB_CONNECTION_STRING=postgresql:///sociallists
start: export PYTHONPATH=.
start:
	python -m sociallists

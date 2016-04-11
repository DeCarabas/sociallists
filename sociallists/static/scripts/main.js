var React = require('react');
var ReactDOM = require('react-dom');
import { connect, Provider } from 'react-redux'
import { createStore } from 'redux'

import { data } from './data'
import { RiverColumn } from './ui'

// Redux actions-- these are basically helper functions and records to carry
// events into the reducer, below.
const RIVER_UPDATE_START = 'RIVER_UPDATE_START';
function riverUpdateStart(id) {
  return {
    type: RIVER_UPDATE_START,
    id: id,
  };
}

const RIVER_UPDATE_SUCCESS = 'RIVER_UPDATE_SUCCESS';
function riverUpdateSuccess(id, river) {
  return {
    type: RIVER_UPDATE_SUCCESS,
    id: id,
    river: river,
  };
}
const RIVER_UPDATE_FAILED = 'RIVER_UPDATE_FAILED';
function riverUpdateFailed(id, error) {
  return {
    type: RIVER_UPDATE_FAILED,
    id: id,
    error: error,
  };
}

// The redux reducer-- this is the core logic of the app that evolves the app
// state in response to actions.
function state_river(state = {}, action) {
  switch(action.type) {
    case RIVER_UPDATE_SUCCESS:
      return action.river;
    default:
      return state;
  }
}

function sociallistsApp(state = {}, action) {
  return {
    river: state_river(state.river, action),
  };
}

// State store, where it all comes together.
//
let store = createStore(sociallistsApp, { river: data });

// Visible Column Setup, which maps redux stuff to react stuff. connect() makes
// a react component.
//
const mapStateToProps = (state) => {
  return {
    updates: state.river.updatedFeeds.updatedFeed,
  };
};
const mapDispatchToProps = (dispatch) => {
  return { };
};
const VisibleRiverColumn = connect(mapStateToProps, mapDispatchToProps)(
  RiverColumn
);

// OK I don't know what I'm doing here.
//
function doRefresh(dispatch, river_id = 'Main') {
  dispatch(riverUpdateStart(river_id));
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "api/v1/river/doty/" + river_id, true);
  xhr.addEventListener("progress", (e) => {
    console.log("Progress", river_id);
    // TODO: Event for progress
  });
  xhr.addEventListener("load", (e) => {
    console.log("Loaded", river_id);
    const river = JSON.parse(xhr.responseText);
    dispatch(riverUpdateSuccess(river_id, river));
  });
  xhr.addEventListener("error", (e) => {
    console.log("Error", river_id);
    dispatch(riverUpdateFailed(river_id, xhr.statusText));
  });
  xhr.addEventListener("abort", (e) => {
    console.log("Aborted", river_id);
    // TODO: Event for abort
  });
  xhr.send();
  console.log('Started', river_id);
}

ReactDOM.render(
  <Provider store={store}>
    <VisibleRiverColumn />
  </Provider>,
  document.getElementById('example')
);
doRefresh(store.dispatch.bind(store));

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
function riverUpdateSuccess(id, response) {
  return {
    type: RIVER_UPDATE_SUCCESS,
    id: id,
    response: response,
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
//
// State in the app looks like this:
//
//  {
//    rivers: {              // state_rivers
//      'Main': [            // state_river
//         // A bunch of feed update objects
//      ],
//    },
//  }
//
function state_river(state = [], action) {
  switch(action.type) {
    case RIVER_UPDATE_SUCCESS:
      return action.response.updatedFeeds.updatedFeed;
    default:
      return state;
  }
}

function state_rivers(state = {}, action) {
  switch(action.type) {
    case RIVER_UPDATE_SUCCESS:
      // NOTE: this instead of Object.assign({}, state, {...}) weirdness because
      //       that latter one was just a little bit too precious for me.
      let new_state = Object.assign({}, state);
      new_state[action.id] = state_river(state[action.id], action);
      return new_state;
    default:
      return state;
  }
}

function sociallistsApp(state = {}, action) {
  return {
    rivers: state_rivers(state.rivers, action),
  };
}

// State store, where it all comes together.
//
let store = createStore(sociallistsApp, {
  rivers: {
    'Main': data.updatedFeeds.updatedFeed,
  },
});

// Visible Column Setup, which maps redux stuff to react stuff. connect() makes
// a react component.
//
const mapStateToProps = (state) => {
  return {
    updates: state.rivers['Main'],
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
    console.log("Loaded the river", river_id);
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

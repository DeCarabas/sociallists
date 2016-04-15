var React = require('react');
var ReactDOM = require('react-dom');
import { connect, Provider } from 'react-redux'
import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'

// import { data } from './data'
import { AppRoot } from './ui'

// Redux actions-- these are basically helper functions and records to carry
// events into the reducer, below.
//
const RIVER_LIST_UPDATE_START = 'RIVER_LIST_UPDATE_START';
function riverListUpdateStart() {
  return {
    type: RIVER_LIST_UPDATE_START,
  };
}

const RIVER_LIST_UPDATE_SUCCESS = 'RIVER_LIST_UPDATE_SUCCESS';
function riverListUpdateSuccess(response) {
  return {
    type: RIVER_LIST_UPDATE_SUCCESS,
    response: response,
  };
}
const RIVER_LIST_UPDATE_FAILED = 'RIVER_LIST_UPDATE_FAILED';
function riverListUpdateFailed(error) {
  return {
    type: RIVER_LIST_UPDATE_FAILED,
    error: error,
  };
}

const RIVER_UPDATE_START = 'RIVER_UPDATE_START';
function riverUpdateStart(index) {
  return {
    type: RIVER_UPDATE_START,
    index: index,
  };
}

const RIVER_UPDATE_SUCCESS = 'RIVER_UPDATE_SUCCESS';
function riverUpdateSuccess(index, name, url, response) {
  return {
    type: RIVER_UPDATE_SUCCESS,
    index: index,
    name: name,
    url: url,
    response: response,
  };
}
const RIVER_UPDATE_FAILED = 'RIVER_UPDATE_FAILED';
function riverUpdateFailed(index, error) {
  return {
    type: RIVER_UPDATE_FAILED,
    index: index,
    error: error,
  };
}

function refreshRiver(index, river_name, river_url) {
  return function doRefreshRiver(dispatch) {
    dispatch(riverUpdateStart(index));
    var xhr = new XMLHttpRequest();
    xhr.open("GET", river_url, true);
    xhr.addEventListener("progress", (e) => {
      console.log("Progress", river_name);
      // TODO: Event for progress
    });
    xhr.addEventListener("load", (e) => {
      console.log("Loaded the river", river_name);
      const response = JSON.parse(xhr.responseText);
      // TODO: Error handling
      dispatch(riverUpdateSuccess(index, river_name, river_url, response));
    });
    xhr.addEventListener("error", (e) => {
      console.log("Error", river_name);
      dispatch(riverUpdateFailed(index, xhr.statusText));
    });
    xhr.addEventListener("abort", (e) => {
      console.log("Aborted", river_name);
      // TODO: Event for abort
    });
    xhr.send();
    console.log('Started', river_name);
  };
}

function refreshRiverList() {
  return function doRefreshRiverList(dispatch) {
    dispatch(riverListUpdateStart());
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "api/v1/river/doty", true);
    xhr.addEventListener("progress", (e) => {
      console.log("Progress loading the river list");
      // TODO: Event for progress
    });
    xhr.addEventListener("load", (e) => {
      console.log("Loaded the river list");
      const response = JSON.parse(xhr.responseText);
      console.log(response);

      dispatch(riverListUpdateSuccess(response));
      response.rivers.forEach((river, index) => {
        dispatch(refreshRiver(index, river.name, river.url));
      });
    });
    xhr.addEventListener("error", (e) => {
      console.log("Error refreshing river list", xhr.statusText);
      dispatch(riverListUpdateFailed(xhr.statusText));
    });
    xhr.addEventListener("abort", (e) => {
      console.log("Aborted river list refresh");
      // TODO: Event for abort
    });
    xhr.send();
    console.log('Started refreshing river list');
  };
}

// The redux reducer-- this is the core logic of the app that evolves the app
// state in response to actions.
//
// const default_state = {
//   rivers: [
//     {
//       name: 'Main',
//       updates: data.updatedFeeds.updatedFeed,
//       url: '/api/v1/river/doty/Main',
//     },
//   ],
// }

function state_river(state = {}, action) {
  switch(action.type) {
    case RIVER_UPDATE_SUCCESS:
      return Object.assign({}, state, {
        name: action.name,
        updates: action.response.updatedFeeds.updatedFeed,
        url: action.url,
      });
    default:
      return state;
  }
}

function migrateRiverList(old_river_list, new_river_list) {
  let empty_updates = { updates: [] };
  return new_river_list.map(nr => {
    let old_river = old_river_list.find(or => or.name === nr.name);
    return {
      name: nr.name,
      url: nr.url,
      updates: (old_river || empty_updates).updates,
    };
  });
}

function state_rivers(state = [], action) {
  switch(action.type) {
    case RIVER_LIST_UPDATE_SUCCESS:
      return migrateRiverList(state, action.response.rivers);
    case RIVER_UPDATE_SUCCESS:
      return [].concat(
        state.slice(0, action.index),
        state_river(state[action.index], action),
        state.slice(action.index+1, state.length)
      );
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
let store = createStore(
  sociallistsApp,
  // default_state,
  applyMiddleware(thunkMiddleware)
);

ReactDOM.render(
  <Provider store={store}>
    <AppRoot />
  </Provider>,
  document.getElementById('example')
);

store.dispatch(refreshRiverList());

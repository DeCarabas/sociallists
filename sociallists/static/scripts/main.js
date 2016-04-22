var React = require('react');
var ReactDOM = require('react-dom');
import { connect, Provider } from 'react-redux'
import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'

import {
  RIVER_LIST_UPDATE_SUCCESS,
  RIVER_UPDATE_SUCCESS,
  refreshRiverList
} from './actions'

// import { data } from './data'
import AppRoot from './components/approot'

// The redux reducer-- this is the core logic of the app that evolves the app
// state in response to actions.

// The default state of a river object.
const def_river = {
  name: '(Untitled)',
  updates: [],
  show_add_box: false,
  state: 'none',
};

function state_river(state = def_river, action) {
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

function state_rivers(state = [], action) {
  switch(action.type) {
    case RIVER_LIST_UPDATE_SUCCESS:
      return action.response.rivers.map(nr => {
        let old_river = state.find(or => or.name === nr.name) || def_river;
        return Object.assign({}, old_river, {
          name: nr.name,
          url: nr.url,
        });
      });
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

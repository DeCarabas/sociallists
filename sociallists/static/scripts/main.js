var React = require('react');
var ReactDOM = require('react-dom');
import { connect, Provider } from 'react-redux'
import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'

import {
  TOGGLE_ADD_FEED_BOX,
  RIVER_ADD_FEED_URL_CHANGED,
  RIVER_ADD_FEED_START,
  RIVER_ADD_FEED_FAILED,
  RIVER_ADD_FEED_SUCCESS,
  RIVER_LIST_UPDATE_SUCCESS,
  RIVER_UPDATE_START,
  RIVER_UPDATE_FAILED,
  RIVER_UPDATE_SUCCESS,
  refreshRiverList
} from './actions'

// import { data } from './data'
import AppRoot from './components/approot'

// The redux reducer-- this is the core logic of the app that evolves the app
// state in response to actions.

// The default state of a river object.
const def_river = {
  loading: false,
  name: '(Untitled)',
  updates: [],
  show_add_box: false,
  state: 'none',
  url_add_value: '',
};

function state_river_loading(state = false, action) {
  switch(action.type)
  {
    case RIVER_ADD_FEED_START:
    case RIVER_UPDATE_START:
      return true;

    case RIVER_ADD_FEED_SUCCESS:
    case RIVER_ADD_FEED_FAILED:
    case RIVER_UPDATE_SUCCESS:
    case RIVER_UPDATE_FAILED:
      return false;

    default:
      return state;
  }
}

function state_river_name(state = '', action) {
  switch(action.type)
  {
    case RIVER_UPDATE_SUCCESS: return action.name;
    default:                   return state;
  }
}

function state_river_url(state = '', action) {
  switch(action.type)
  {
    case RIVER_UPDATE_SUCCESS: return action.url;
    default:                   return state;
  }
}

function state_river_show_add_box(state = false, action)
{
  switch(action.type)
  {
    case RIVER_ADD_FEED_START: return false;
    case TOGGLE_ADD_FEED_BOX:  return !state;
    default:                   return state;
  }
}

function state_river_url_add_value(state = '', action)
{
  switch(action.type)
  {
    case RIVER_ADD_FEED_START:       return '';
    case RIVER_ADD_FEED_URL_CHANGED: return action.new_value;
    case TOGGLE_ADD_FEED_BOX:        return '';
    default: return state;
  }
}

function state_river_updates(state = [], action) {
  switch(action.type)
  {
    case RIVER_UPDATE_SUCCESS:
      return action.response.updatedFeeds.updatedFeed;
    default:
      return state;
  }
}

function state_river(state = def_river, action) {
  return Object.assign({}, state, {
    loading:       state_river_loading(state.loading, action),
    name:          state_river_name(state.name, action),
    show_add_box:  state_river_show_add_box(state.show_add_box, action),
    updates:       state_river_updates(state.updates, action),
    url:           state_river_url(state.url, action),
    url_add_value: state_river_url_add_value(state.url_add_value, action),
  });
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
    case RIVER_ADD_FEED_URL_CHANGED:
    case TOGGLE_ADD_FEED_BOX:
    case RIVER_UPDATE_START:
    case RIVER_UPDATE_FAILED:
    case RIVER_UPDATE_SUCCESS:
    case RIVER_ADD_FEED_START:
    case RIVER_ADD_FEED_FAILED:
    case RIVER_ADD_FEED_SUCCESS:
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

var React = require('react');
var ReactDOM = require('react-dom');
import { connect, Provider } from 'react-redux'
import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import createLogger from 'redux-logger'
import { update_key } from './util'
import { registerMessageHandlers } from './ipchandler'

import {
  RIVER_MODE_AUTO,
  RIVER_MODE_TEXT,
  RIVER_MODE_IMAGE,

  EXPAND_FEED_UPDATE,
  COLLAPSE_FEED_UPDATE,
  SHOW_RIVER_SETTINGS,
  HIDE_RIVER_SETTINGS,
  RIVER_ADD_FEED_URL_CHANGED,
  RIVER_ADD_FEED_START,
  RIVER_ADD_FEED_FAILED,
  RIVER_ADD_FEED_SUCCESS,
  RIVER_LIST_UPDATE_SUCCESS,
  RIVER_SET_FEED_MODE,
  RIVER_UPDATE_START,
  RIVER_UPDATE_FAILED,
  RIVER_UPDATE_SUCCESS,
  REFRESH_ALL_FEEDS_START,
  REFRESH_ALL_FEEDS_SUCCESS,
  REFRESH_ALL_FEEDS_ERROR,
  REFRESH_ALL_FEEDS_PROGRESS,
  refreshRiverList
} from './actions'

// import { data } from './data'
import AppRoot from './components/approot'

// The redux reducer-- this is the core logic of the app that evolves the app
// state in response to actions.

// The default state of a river object.
const def_river = {
  modal: { kind: 'none', },
  name: '(Untitled)',
  updates: [],
  url: '',
  mode: RIVER_MODE_AUTO,
};

function apply_state_array(state, index, reduce, action) {
  return index < 0
    ? state
    : [].concat(
        state.slice(0, index),
        reduce(state[index], action),
        state.slice(index+1, state.length)
      );
}

function migrate_updates(old_updates, new_updates) {
  // We grow updates at the top.
  if (!old_updates.length) { return new_updates; }
  const start_key = update_key(old_updates[0]);
  const match_index = new_updates.findIndex(u => update_key(u) === start_key);
  if (match_index < 0) { return new_updates; }
  return [].concat(new_updates.slice(0, match_index), old_updates);
}

function state_river_feed_update(state = {}, action) {
  switch(action.type) {
    case EXPAND_FEED_UPDATE:
      return Object.assign({}, state, { expanded: true });
    case COLLAPSE_FEED_UPDATE:
      return Object.assign({}, state, { expanded: false });
    default:
      return state;
  }
}

function state_river_feed_updates(state = [], action) {
  switch(action.type) {
    case RIVER_UPDATE_SUCCESS:
      return migrate_updates(state, action.response.updatedFeeds.updatedFeed);
    case EXPAND_FEED_UPDATE:
    case COLLAPSE_FEED_UPDATE:
      const index = state.findIndex(u => update_key(u) === action.update_key);
      return apply_state_array(state, index, state_river_feed_update, action);
    default:
      return state;
  }
}

function state_river(state = def_river, action) {
  switch(action.type) {
    case RIVER_ADD_FEED_START:
    case RIVER_UPDATE_START:
      return Object.assign({}, state, {
        modal: { kind: 'loading', percent: 1 },
      });
    case RIVER_SET_FEED_MODE:
      return Object.assign({}, state, {
        mode: action.mode,
      });
    case RIVER_ADD_FEED_SUCCESS:
      return Object.assign({}, state, {
        modal: { kind: 'none', },
      });
    case RIVER_ADD_FEED_FAILED:
    case RIVER_UPDATE_FAILED:
      return Object.assign({}, state, {
        modal: { kind: 'error', error: action.error, },
      });
    case RIVER_UPDATE_SUCCESS:
      return Object.assign({}, state, {
        modal: { kind: 'none', },
        name: action.name,
        updates: state_river_feed_updates(state.updates, action),
        url: action.url,
        id: action.id,
        mode: action.response.metadata.mode || state.mode,
      });
    case RIVER_ADD_FEED_URL_CHANGED:
      if (state.modal && state.modal.kind === 'settings') {
        return Object.assign({}, state, {
          modal: { kind: 'settings', value: action.new_value },
        });
      } else {
        return state;
      }
    case SHOW_RIVER_SETTINGS:
      return Object.assign({}, state, {
        modal: { kind: 'settings', value: '', },
      });
    case HIDE_RIVER_SETTINGS:
      return Object.assign({}, state, {
        modal: { kind: 'none', },
      });
    case EXPAND_FEED_UPDATE:
    case COLLAPSE_FEED_UPDATE:
      return Object.assign({}, state, {
        updates: state_river_feed_updates(state.updates, action),
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
    case EXPAND_FEED_UPDATE:
    case COLLAPSE_FEED_UPDATE:
    case SHOW_RIVER_SETTINGS:
    case HIDE_RIVER_SETTINGS:
    case RIVER_SET_FEED_MODE:
    case RIVER_UPDATE_START:
    case RIVER_UPDATE_FAILED:
    case RIVER_UPDATE_SUCCESS:
    case RIVER_ADD_FEED_START:
    case RIVER_ADD_FEED_FAILED:
    case RIVER_ADD_FEED_SUCCESS:
    case RIVER_ADD_FEED_URL_CHANGED:
      return apply_state_array(state, action.river_index, state_river, action);
    default:
      return state;
  }
}

function state_loading(state = false, action) {
  switch(action.type) {
    case REFRESH_ALL_FEEDS_START:
      return true;

    case REFRESH_ALL_FEEDS_SUCCESS:
    case REFRESH_ALL_FEEDS_ERROR:
      return false;

    default:
      return state;
  }
}

function state_load_progress(state = 0, action) {
  switch(action.type) {
    case REFRESH_ALL_FEEDS_START:
    case REFRESH_ALL_FEEDS_SUCCESS:
    case REFRESH_ALL_FEEDS_ERROR:
      return 0;

    case REFRESH_ALL_FEEDS_PROGRESS:
      return action.percent;

    default:
      return state;
  }
}

function sociallistsApp(state = {}, action) {
  return {
    rivers: state_rivers(state.rivers, action),
    loading: state_loading(state.loading, action),
    load_progress: state_load_progress(state.load_progress, action),
  };
}

// State store, where it all comes together.
//
const logger = createLogger({
  collapsed: true,
});
const store = createStore(
  sociallistsApp,
  applyMiddleware(thunkMiddleware, logger)
);

ReactDOM.render(
  <Provider store={store}>
    <AppRoot />
  </Provider>,
  document.getElementById('example')
);

registerMessageHandlers(store.dispatch);
store.dispatch(refreshRiverList());

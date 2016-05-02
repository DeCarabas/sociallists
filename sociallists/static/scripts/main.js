var React = require('react');
var ReactDOM = require('react-dom');
import { connect, Provider } from 'react-redux'
import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import createLogger from 'redux-logger'

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
};

function state_river(state = def_river, action) {
  switch(action.type) {
    case RIVER_ADD_FEED_START:
    case RIVER_UPDATE_START:
      return Object.assign({}, state, {
        modal: { kind: 'loading', percent: 1 },
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
        updates: action.response.updatedFeeds.updatedFeed,
        url: action.url,
      });
    case RIVER_ADD_FEED_URL_CHANGED:
      if (state.modal && state.modal.kind === 'add_feed') {
        return Object.assign({}, state, {
          modal: { kind: 'add_feed', value: action.new_value },
        });
      } else {
        return state;
      }
    case TOGGLE_ADD_FEED_BOX:
      if (state.modal && state.modal.kind === 'add_feed') {
        return Object.assign({}, state, {
          modal: { kind: 'none', },
        });
      } else {
        return Object.assign({}, state, {
          modal: { kind: 'add_feed', value: '', }
        });
      }
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
    case TOGGLE_ADD_FEED_BOX:
    case RIVER_UPDATE_START:
    case RIVER_UPDATE_FAILED:
    case RIVER_UPDATE_SUCCESS:
    case RIVER_ADD_FEED_START:
    case RIVER_ADD_FEED_FAILED:
    case RIVER_ADD_FEED_SUCCESS:
    case RIVER_ADD_FEED_URL_CHANGED:
      return [].concat(
        state.slice(0, action.index),
        state_river(state[action.index], action),
        state.slice(action.index+1, state.length)
      );
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

store.dispatch(refreshRiverList());

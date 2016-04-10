var React = require('react');
var ReactDOM = require('react-dom');
import { createStore } from 'redux'
import { data } from './data'
import { RiverColumn } from './ui'

// Actions
const UPDATE_RIVER = 'UPDATE_RIVER';
function updateRiver(river) {
  return {
    type: UPDATE_RIVER,
    river: river,
  }
}

// App
function state_river(state = {}, action) {
  switch(action.type) {
    case UPDATE_RIVER:
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

// Store
let store = createStore(sociallistsApp);

ReactDOM.render(
  <RiverColumn river={ data } />,
  document.getElementById('example')
);

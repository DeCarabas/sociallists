var React = require('react');
var ReactDOM = require('react-dom');
import { data } from './data'
import { River } from './ui'

ReactDOM.render(
  <River river={ data } />,
  document.getElementById('example')
);

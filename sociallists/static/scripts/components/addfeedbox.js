var React = require('react'); // N.B. Still need this because JSX.
import { connect } from 'react-redux'
import {
  COLUMNSPACER,
  TOP_SPACE,
  COLOR_DARK,
  COLOR_VERY_LIGHT,
  COLOR_VERY_DARK,
} from './style'

const AddFeedBoxTitle = () => {
  const style = {
    fontWeight: 'bold',
  }
  return <div style={style}>Add A New Feed</div>;
}

const AddFeedBoxButton = () => {
  const divStyle = {
    textAlign: 'right',
    marginTop: COLUMNSPACER,
  }
  const style = {
    color: 'white',
    backgroundColor: COLOR_DARK,
    padding: 3,
    border: '2px solid ' + COLOR_VERY_DARK,
    cursor: 'pointer',
  }
  return <div style={divStyle}><span style={style}>Add Feed</span></div>;
}

const AddFeedBoxUrl = () => {
  const style = {
    width: '100%',
  }
  return <div style={style}><input style={style} type="text" /></div>;
}

const AddFeedBox = () => {
  const style = {
    backgroundColor: COLOR_VERY_LIGHT,
    zIndex: 3,
    position: 'absolute',
    top: TOP_SPACE,
    left: 0,
    right: 0,
    padding: COLUMNSPACER,
    borderBottom: '1px solid ' + COLOR_VERY_DARK,
  };

  return <div style={style}>
    <AddFeedBoxTitle />
    <AddFeedBoxUrl />
    <AddFeedBoxButton />
  </div>;
}

export default AddFeedBox;

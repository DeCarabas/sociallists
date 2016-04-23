var React = require('react'); // N.B. Still need this because JSX.
import { connect } from 'react-redux'
import {
  COLUMNSPACER,
  TOP_SPACE,
  COLOR_DARK,
  COLOR_VERY_LIGHT,
  COLOR_VERY_DARK,
} from './style'
import { addFeedToRiver, riverAddFeedUrlChanged } from '../actions'

const AddFeedBoxTitle = () => {
  const style = {
    fontWeight: 'bold',
  }
  return <div style={style}>Add A New Feed</div>;
}

const AddFeedBoxButton = ({onClick}) => {
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
  return <div style={divStyle}>
    <span style={style} onClick={onClick}>Add Feed</span>
  </div>;
}

const AddFeedBoxUrl = ({onChange}) => {
  const style = {
    width: '100%',
  }
  return <div style={style}>
    <input
      style={style}
      type="text"
      onChange={ (e) => onChange(e.target.value) }
    />
  </div>;
}

const AddFeedBoxBase = ({index, river, feedUrlChanged, addFeedToRiver}) => {
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
    <AddFeedBoxUrl onChange={(text) => feedUrlChanged(index, text)} />
    <AddFeedBoxButton onClick={() => addFeedToRiver(index, river)} />
  </div>;
}

const mapStateToProps = (state) => {
  return {
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    'feedUrlChanged': (index, new_value) =>
      dispatch(riverAddFeedUrlChanged(index, new_value)),
    'addFeedToRiver': (index, river) => dispatch(addFeedToRiver(index, river)),
  };
};

const AddFeedBox = connect(mapStateToProps, mapDispatchToProps)(AddFeedBoxBase);

export default AddFeedBox;

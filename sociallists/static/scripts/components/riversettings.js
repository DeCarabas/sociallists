var React = require('react'); // N.B. Still need this because JSX.
import { connect } from 'react-redux'
import {
  COLUMNSPACER,
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

const AddFeedBox = ({index, river, feedUrlChanged, addFeedToRiver}) => {
  return <div>
    <AddFeedBoxTitle />
    <AddFeedBoxUrl onChange={(text) => feedUrlChanged(index, text)} />
    <AddFeedBoxButton onClick={() => addFeedToRiver(index, river)} />
  </div>;
}

const RiverSettingsBase = ({index, river, feedUrlChanged, addFeedToRiver}) => {
  const style = {
    backgroundColor: COLOR_VERY_LIGHT,
    zIndex: 3,
    position: 'absolute',
    left: 0,
    right: 0,
    padding: COLUMNSPACER,
    border: '1px solid ' + COLOR_VERY_DARK,
  };

  return <div style={style}>
    <AddFeedBox
      index={index}
      river={river}
      feedUrlChanged={feedUrlChanged}
      addFeedToRiver={addFeedToRiver} />
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

const RiverSettings =
  connect(mapStateToProps, mapDispatchToProps)(RiverSettingsBase);

export default RiverSettings;

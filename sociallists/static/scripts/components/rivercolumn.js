var React = require('react'); // N.B. Still need this because JSX.
import { connect } from 'react-redux'
import {
  COLUMNWIDTH,
  COLUMNSPACER,
  RIVER_COLUMN_BACKGROUND_COLOR,
  TOP_SPACE,
  COLOR_DARK,
  COLOR_VERY_LIGHT,
  COLOR_VERY_DARK
} from './style'
import RiverTitle from './rivertitle'
import RiverUpdates from './riverupdates'
import { refreshRiver, toggleAddFeedBox } from '../actions'

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

// RiverColumn
//
const RiverColumnBase = ({rivers, index, onAdd, onRefresh}) => {
  let style = {
    width: COLUMNWIDTH,
    position: 'absolute',
    top: COLUMNSPACER,
    left: index * (COLUMNWIDTH + COLUMNSPACER) + COLUMNSPACER,
    backgroundColor: RIVER_COLUMN_BACKGROUND_COLOR,
    bottom: COLUMNSPACER,
    borderRadius: 10,
    border: '1px solid ' + COLOR_VERY_DARK,
  };

  let river = rivers[index] || {};

  return (
    <div style={style}>
      <RiverTitle
        river={river}
        onAdd={onAdd(index, river)}
        onRefresh={onRefresh(index, river)}
      />
      { river.show_add_box ? <AddFeedBox /> : <span /> }
      <RiverUpdates river={river} />
    </div>
  );
};

// VisibleRiverColumn
//
const vrc_mapStateToProps = (state) => {
  return {
    rivers: state.rivers,
  };
};
const vrc_mapDispatchToProps = (dispatch) => {
  return {
    onAdd: (i, r) => (() => dispatch(toggleAddFeedBox(i))),
    onRefresh: (i, r) => (() => dispatch(refreshRiver(i, r.name, r.url))),
  };
};

const RiverColumn = connect(
  vrc_mapStateToProps,
  vrc_mapDispatchToProps
)(
  RiverColumnBase
);

export default RiverColumn;

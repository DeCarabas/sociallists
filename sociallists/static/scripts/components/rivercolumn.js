var React = require('react'); // N.B. Still need this because JSX.
import { connect } from 'react-redux'
import {
  COLUMNWIDTH,
  COLUMNSPACER,
  RIVER_COLUMN_BACKGROUND_COLOR,
  COLOR_VERY_DARK
} from './style'
import RiverTitle from './rivertitle'
import RiverUpdates from './riverupdates'

// RiverColumn
//
const RiverColumnBase = ({rivers, index}) => {
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
      <RiverTitle river={river} />
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
  return { };
};

const RiverColumn = connect(
  vrc_mapStateToProps,
  vrc_mapDispatchToProps
)(
  RiverColumnBase
);

export default RiverColumn;

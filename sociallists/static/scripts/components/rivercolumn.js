var React = require('react'); // N.B. Still need this because JSX.
import { connect } from 'react-redux'
import {
  COLUMNWIDTH,
  COLUMNSPACER,
  RIVER_COLUMN_BACKGROUND_COLOR,
  COLOR_VERY_DARK
} from './style'
import AddFeedBox from './addfeedbox'
import RiverProgress from './riverprogress'
import RiverTitle from './rivertitle'
import RiverUpdates from './riverupdates'
import { refreshRiver, toggleAddFeedBox } from '../actions'

function modalForRiver(river, index) {
  const modal = river.modal || {};
  switch (modal.kind) {
    case 'loading': return <RiverProgress percent={modal.percent} />;
    case 'add_feed': return <AddFeedBox river={river} index={index} />;
    default: return <span />;
  }
}

const RiverColumnBase = ({rivers, index, onAdd}) => {
  const style = {
    backgroundColor: RIVER_COLUMN_BACKGROUND_COLOR,
    borderRadius: 10,
    border: '1px solid ' + COLOR_VERY_DARK,
    height: '100%',
    width: '100%',
  };

  const river = rivers[index] || {};
  const modal = modalForRiver(river, index);
  return (
    <div style={style}>
      <RiverTitle
        river={river}
        onAdd={onAdd(index, river)}
      />
      {modal}
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
  };
};

const RiverColumn = connect(
  vrc_mapStateToProps,
  vrc_mapDispatchToProps
)(
  RiverColumnBase
);

export default RiverColumn;

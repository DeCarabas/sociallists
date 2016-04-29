var React = require('react'); // N.B. Still need this because JSX.
import { connect } from 'react-redux'
import {
  BUTTON_STYLE,
  COLUMNSPACER,
  COLUMNWIDTH,
  RIVER_TITLE_FONT_SIZE,
  RIVER_TITLE_BACKGROUND_COLOR,
} from './style'
import RiverColumn from './rivercolumn'

const RiverSetBar = ({title}) => {
  const div_style = {
    position: 'fixed',
    backgroundColor: RIVER_TITLE_BACKGROUND_COLOR,
    top: 0, left: 0, width: '100%',
  };
  const head_style = {
    fontSize: RIVER_TITLE_FONT_SIZE,
    display: 'inline-block',
    paddingLeft: COLUMNSPACER,
    fontWeight: 'bold',
  };
  const refresh_style = {
    display: 'inline-block',
    float: 'right',
  };
  return <div style={div_style}>
    <div style={head_style}>{title}</div>
    <div style={refresh_style}>
      <i style={BUTTON_STYLE} className="fa fa-refresh" />
    </div>
  </div>
}

export const RiverSetBase = ({rivers}) => {
  const TOTAL_SPACING = COLUMNSPACER * rivers.length;
  const TOTAL_COLUMNS = COLUMNWIDTH * rivers.length;

  const style = {
    position: 'relative',
    height: '100%',
  };
  const inner_style = {
    padding: 10,
    position: 'relative',
    width: TOTAL_SPACING + TOTAL_COLUMNS,
    height: '100%',
  };
  return (
    <div style={style}>
      <RiverSetBar key='riverbar' title='Rivers' />
      <div style={inner_style}>
      {
        rivers.map((r, index) =>
          <RiverColumn key={r.name} index={index} />
        )
      }
      </div>
    </div>
  );
};

// VisibleRiverSet
//
const vrs_mapStateToProps = (state) => {
  return {
    rivers: state.rivers,
  }
};
const vrs_mapDispatchToProps = (dispatch) => {
  return { };
};
const RiverSet = connect(
  vrs_mapStateToProps,
  vrs_mapDispatchToProps
)(
  RiverSetBase
);

export default RiverSet;

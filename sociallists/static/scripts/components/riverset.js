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
    backgroundColor: RIVER_TITLE_BACKGROUND_COLOR,
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
  const top_bar_style = {
    position: 'fixed',
    top: 0, left: 0, width: '100%',
  };
  const column_set_style = {
    padding: 10,
    position: 'relative',
    width: TOTAL_SPACING + TOTAL_COLUMNS,
    height: '100%',
  };
  const column_style = {
    width: COLUMNWIDTH,
    position: 'absolute',
    top: COLUMNSPACER * 4,
    bottom: COLUMNSPACER,
  };
  return (
    <div style={style}>
      <div key='river_set_bar' style={top_bar_style}>
        <RiverSetBar title='Rivers' />
      </div>
      <div key='river_set' style={column_set_style}>
      {
        rivers.map((r, index) => {
          const c_style = Object.assign({}, column_style, {
            left: index * (COLUMNWIDTH + COLUMNSPACER) + COLUMNSPACER,
          });
          return <div style={c_style} key={r.name}>
            <RiverColumn index={index} />
          </div>
        })
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

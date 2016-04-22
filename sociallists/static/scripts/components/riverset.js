var React = require('react'); // N.B. Still need this because JSX.
import { connect } from 'react-redux'
import { COLUMNSPACER, COLUMNWIDTH } from './style'
import RiverColumn from './rivercolumn'

// RiverSet
//
export const RiverSetBase = ({rivers}) => {
  const TOTAL_SPACING = COLUMNSPACER * rivers.length;
  const TOTAL_COLUMNS = COLUMNWIDTH * rivers.length;

  const style = {
    padding: 10,
    position: 'relative',
    width: TOTAL_SPACING + TOTAL_COLUMNS,
    height: '100%',
  };
  return (
    <div style={style}>
    {
      rivers.map((r, index) =>
        <RiverColumn key={r.name} index={index} />
      )
    }
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

var React = require('react'); // N.B. Still need this because JSX.
import {
  COLUMNWIDTH,
  COLUMNSPACER,
  ICON_FONT_SIZE,
  RIVER_TITLE_BACKGROUND_COLOR,
  RIVER_TITLE_FONT_SIZE,
} from './style'

const RiverRefreshButton = ({onClick}) => {
  const style = {
    fontSize: ICON_FONT_SIZE,
    float: 'right',
    paddingRight: COLUMNSPACER,
    paddingTop: 8,
    cursor: 'pointer',
  }

  return <i className='fa fa-refresh' style={style} onClick={onClick} />
}

const RiverTitle = ({river, onRefresh}) => {
  const divStyle = {
    backgroundColor: RIVER_TITLE_BACKGROUND_COLOR,
  }
  const style = {
    paddingLeft: COLUMNSPACER,
    fontSize: RIVER_TITLE_FONT_SIZE,
  }

  return <div style={divStyle}>
    <RiverRefreshButton onClick={onRefresh} />
    <h1 style={style}>{river.name}</h1>
  </div>;
};

export default RiverTitle;

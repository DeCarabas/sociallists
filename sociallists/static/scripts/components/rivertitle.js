var React = require('react'); // N.B. Still need this because JSX.
import {
  COLUMNWIDTH,
  COLUMNSPACER,
  ICON_FONT_SIZE,
  RIVER_TITLE_BACKGROUND_COLOR,
  RIVER_TITLE_FONT_SIZE,
  BUTTON_STYLE,
} from './style'

const RiverAddButton = ({river, onClick}) => {
  const icon = river.show_add_box ? 'fa-chevron-up' : 'fa-plus';
  return <i className={'fa ' + icon} style={BUTTON_STYLE} onClick={onClick} />
}

const RiverTitle = ({river, onAdd}) => {
  const divStyle = {
    backgroundColor: RIVER_TITLE_BACKGROUND_COLOR,
  }
  const style = {
    paddingLeft: COLUMNSPACER,
    fontSize: RIVER_TITLE_FONT_SIZE,
    marginBottom: 0,
  }

  return <div style={divStyle}>
    <RiverAddButton river={river} onClick={onAdd} />
    <h1 style={style}>{river.name}</h1>
  </div>;
};

export default RiverTitle;

var React = require('react'); // N.B. Still need this because JSX.
import { RIVER_TITLE_BACKGROUND_COLOR, RIVER_TITLE_FONT_SIZE } from './style'

const RiverTitle = ({river}) => {
  const style = {
    paddingLeft: 10,
    backgroundColor: RIVER_TITLE_BACKGROUND_COLOR,
    fontSize: RIVER_TITLE_FONT_SIZE,
  }
  return <h1 style={style}>{river.name}</h1>;
};

export default RiverTitle;

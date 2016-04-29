var React = require('react'); // N.B. Still need this because JSX.
import RiverSet from './riverset'
import {
  APP_TEXT_COLOR,
  SANS_FONTS,
  TEXT_FONT_SIZE,
  APP_BACKGROUND_COLOR,

  BUTTON_STYLE,
  COLUMNSPACER,
  RIVER_TITLE_FONT_SIZE,
  RIVER_TITLE_BACKGROUND_COLOR,
} from './style'

const RiverSetBar = ({title}) => {
  const div_style = {
    position: 'relative',
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

// AppRoot
//
const AppRoot = () => {
  const appstyle = {
    color: APP_TEXT_COLOR,
    fontFamily: SANS_FONTS,
    fontSize: TEXT_FONT_SIZE,
    height: '100%',
  };
  const bgstyle = {
    backgroundColor: APP_BACKGROUND_COLOR,
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  };
  return <div style={appstyle} >
    <div style={bgstyle} />
    <RiverSetBar title='Rivers' />
    <RiverSet />
  </div>;
};

export default AppRoot;

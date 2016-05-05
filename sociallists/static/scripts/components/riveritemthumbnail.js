var React = require('react'); // N.B. Still need this because JSX.
import { FULL_IMAGE_WIDTH } from './style'

const RiverItemThumbnail = ({item, mode = 'auto'}) => {
  let thumb = item.thumbnail;
  if (thumb) {
    let imgstyle = {
      width: 100,
      height: 100,
      marginTop: 10,
      marginLeft: 3,
      marginRight: 3,
      marginBottom: 3,
    }
    if ((mode === 'text') ||
       (mode === 'auto' && (item.body || '').length > 140)) {
      imgstyle.float = 'right';
      imgstyle.width = 100;
      imgstyle.height = 100;
    } else {
      imgstyle.width = FULL_IMAGE_WIDTH;
      imgstyle.height = FULL_IMAGE_WIDTH;
    }
    return (
      <a href={item.link} target="_blank">
        <img style={imgstyle} src={thumb.url} />
      </a>
    );
  } else {
    return <span />;
  }
}

export default RiverItemThumbnail

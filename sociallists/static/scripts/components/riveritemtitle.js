var React = require('react'); // N.B. Still need this because JSX.
import { DEFAULT_LINK_STYLE, ITEM_TITLE_FONT_SIZE } from './style'

const RiverItemTitle = ({item}) => {
  const style = Object.assign({}, DEFAULT_LINK_STYLE, {
    fontSize: ITEM_TITLE_FONT_SIZE,
  });
  let titleText = item.title || item.pubDate;
  return (
    <a style={style} href={ item.link } target="_blank">
      { titleText }
    </a>
  );
}

export default RiverItemTitle

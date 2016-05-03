var React = require('react'); // N.B. Still need this because JSX.
import RiverFeedUpdateTitle from './riverfeedupdatetitle'
import RiverItem from './riveritem'

// RiverFeedUpdate
//
const RiverFeedUpdate = ({update}) => {
  const style = {
    margin: 3,
  };

  const innerStyle = {
    marginLeft: 10,
  };

  let items = update.item.slice(0, 3);
  let more_box = (update.item.length > 3
    ? <p>More...</p>
    : <p/>);
  return(
    <div style={style}>
      <RiverFeedUpdateTitle update={update} />
      <div style={innerStyle}>
        { items.map(i => <RiverItem item={i} key={i.id} />) }
        { more_box }
      </div>
    </div>
  );
};

export default RiverFeedUpdate;

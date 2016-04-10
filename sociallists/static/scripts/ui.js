var React = require('react'); // N.B. Still need this because JSX.

export const RiverItem = ({item}) => {
  let style = {
    border: "1px solid AAA",
  };

  return(
    <div style={style}>
      <a href={ item.link }>
        <h4>{ item.title }</h4>
      </a>
      <p>{ item.body }</p>
    </div>
  );
};

export const RiverFeedUpdate = ({update}) => {
  let style = {
    margin: 3,
  };

  let udkeypart = update.feedUrl + '|' + update.whenLastUpdate;
  let items = update.item;
  return(
    <div style={style}>
      <h3>{update.feedTitle}</h3>
      {
        items.map(i =>
          <RiverItem
            item={i}
            key={ udkeypart + '|' + i.id }
          />
        )
      }
    </div>
  );
};

export const RiverColumn = ({river}) => {
  let style = {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "black",
    width: 400,
  };

  let updates = river.updatedFeeds.updatedFeed;
  return (
    <div style={style}>
      {
        updates.map(u =>
          <RiverFeedUpdate
            update={u}
            key={ u.feedUrl + '|' + u.whenLastUpdate }
            />
        )
      }
    </div>
  );
};

var React = require('react'); // N.B. Still need this because JSX.
import { connect } from 'react-redux'

// RiverItem
//
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

// RiverFeedUpdate
//
export const RiverFeedUpdate = ({update}) => {
  let style = {
    margin: 3,
  };

  let udkeypart = update.feedUrl + '|' + update.whenLastUpdate;
  let items = update.item.slice(0, 3);
  let more_box = (update.item.length > 3
    ? <p>More...</p>
    : <p/>);
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
      { more_box }
    </div>
  );
};

// RiverColumn
//
export const RiverColumn = ({rivers, index}) => {
  let style = {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "black",
    width: 400,
  };

  let river = rivers[index] || {};
  let updates = river.updates || [];
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

// VisibleRiverColumn
//
const vrc_mapStateToProps = (state) => {
  return {
    rivers: state.rivers,
  };
};
const vrc_mapDispatchToProps = (dispatch) => {
  return { };
};
export const VisibleRiverColumn = connect(
  vrc_mapStateToProps,
  vrc_mapDispatchToProps
)(
  RiverColumn
);

// RiverSet
//
export const RiverSet = ({rivers}) => {
  return (
    <div>
    {
      rivers.map((r, index) =>
        <VisibleRiverColumn key={r.name} index={index} />
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
export const VisibleRiverSet = connect(
  vrs_mapStateToProps,
  vrs_mapDispatchToProps
)(
  RiverSet
);

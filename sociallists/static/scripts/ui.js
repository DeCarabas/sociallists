var React = require('react'); // N.B. Still need this because JSX.
import { connect } from 'react-redux'

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

export const RiverColumn = ({rivers, riverId}) => {
  let style = {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "black",
    width: 400,
  };

  let updates = rivers[riverId] || [];
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

// Visible Column Setup, which maps redux stuff to react stuff. connect() makes
// a react component.
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

export const RiverSet = ({rivers}) => {
  return (
    <div>
    {
      Object.keys(rivers).map(k =>
        <VisibleRiverColumn key={k} riverId={k} />
      )
    }
    </div>
  );
};

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

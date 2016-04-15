var React = require('react'); // N.B. Still need this because JSX.
import { connect } from 'react-redux'

// http://paletton.com/#uid=12-0u0kleqtbzEKgVuIpcmGtdhZ
const BASE_COLOR = '#7ABD3F';

const COLUMNWIDTH = 400;
const COLUMNSPACER = 10;

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

const RiverFeedUpdateTitle = ({update}) => {
  const style = {
    fontSize: 12,
  };
  return <div style={style}>
    <div style={{float: 'right'}}>{update.whenLastUpdate}</div>
    <a href={update.websiteUrl}>{update.feedTitle}</a>
    <div style={{float: 'clear'}} />
  </div>;
};

// RiverFeedUpdate
//
export const RiverFeedUpdate = ({update}) => {
  const style = {
    margin: 3,
  };

  const innerStyle = {
    marginLeft: 10,
  };

  let udkeypart = update.feedUrl + '|' + update.whenLastUpdate;
  let items = update.item.slice(0, 3);
  let more_box = (update.item.length > 3
    ? <p>More...</p>
    : <p/>);
  return(
    <div style={style}>
      <RiverFeedUpdateTitle update={update} />
      <div style={innerStyle}>
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
    </div>
  );
};

// RiverTitle
//
const RiverTitle = ({river}) => {
  return <h1>{river.name}</h1>;
};

// RiverColumn
//
const RiverColumn = ({rivers, index}) => {
  let style = {
    width: COLUMNWIDTH,
    position: 'absolute',
    top: COLUMNSPACER,
    left: index * (COLUMNWIDTH + COLUMNSPACER) + COLUMNSPACER,
    backgroundColor: 'white',
  };

  let river = rivers[index] || {};
  let updates = river.updates || [];
  return (
    <div style={style}>
      <RiverTitle river={river} />
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
  const TOTAL_SPACING = COLUMNSPACER * rivers.length;
  const TOTAL_COLUMNS = COLUMNWIDTH * rivers.length;

  const style = {
    padding: 10,
    position: 'relative',
    width: TOTAL_SPACING + TOTAL_COLUMNS,
  };
  return (
    <div style={style}>
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

export const AppRoot = () => {
  const bgstyle = {
    backgroundColor: BASE_COLOR,
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  };
  return <div>
    <div style={bgstyle} />
    <VisibleRiverSet />
  </div>;
};

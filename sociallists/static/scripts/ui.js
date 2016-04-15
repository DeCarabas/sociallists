var React = require('react'); // N.B. Still need this because JSX.
import { connect } from 'react-redux'

// http://paletton.com/#uid=12-0u0kleqtbzEKgVuIpcmGtdhZ
const COLOR_VERY_DARK = '#42800B';
const COLOR_DARK = '#5EA222';
const COLOR_BASE = '#7ABD3F';
const COLOR_LIGHT = '#9EDB67';
const COLOR_VERY_LIGHT = '#BFEC97';

const COLOR_BLACK = '#222';
const COLOR_DARK_GREY = '#444';

const SANS_FONTS = [
  'AvenirNext-Medium',
  'HelveticaNeue-Medium',
  'Helvetica Neue',
  'Helvetica',
  'Arial',
  'sans-serif',
];

const COLUMNWIDTH = 400;
const COLUMNSPACER = 10;

const DEFAULT_LINK_STYLE = {
  color: COLOR_BLACK,
  textDecoration: 'initial',
};

export const RiverItemTitle = ({item}) => {
  const style = Object.assign({}, DEFAULT_LINK_STYLE, {
    fontSize: 18,
  });
  return (
    <a style={style} href={ item.link }>
      { item.title }
    </a>
  );
}

// RiverItem
//
export const RiverItem = ({item}) => {
  let style = {
    border: "1px solid AAA",
  };

  return(
    <div style={style}>
      <RiverItemTitle item={item} />
      <p>{ item.body }</p>
    </div>
  );
};

const RiverFeedUpdateTitle = ({update}) => {
  const style = {
    fontSize: 12,
  };
  return <div style={style}>
    <hr />
    <div style={{float: 'right'}}>{update.whenLastUpdate}</div>
    <a style={DEFAULT_LINK_STYLE} href={update.websiteUrl}>
      {update.feedTitle}
    </a>
    <div style={{float: 'clear', marginBottom: 10,}} />
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
  const style = {
    backgroundColor: COLOR_BASE,
  }
  return <h1 style={style}>{river.name}</h1>;
};

// RiverColumn
//
const RiverColumn = ({rivers, index}) => {
  let style = {
    width: COLUMNWIDTH,
    position: 'absolute',
    top: COLUMNSPACER,
    left: index * (COLUMNWIDTH + COLUMNSPACER) + COLUMNSPACER,
    backgroundColor: '#FEFEF2',
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
  const appstyle = {
    color: COLOR_DARK_GREY,
    fontFamily: SANS_FONTS,
  };
  const bgstyle = {
    backgroundColor: COLOR_VERY_LIGHT,
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  };
  return <div style={appstyle} >
    <div style={bgstyle} />
    <VisibleRiverSet />
  </div>;
};

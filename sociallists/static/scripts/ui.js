var React = require('react'); // N.B. Still need this because JSX.
import { connect } from 'react-redux'

// ---- Palette
// http://paletton.com/#uid=12-0u0kleqtbzEKgVuIpcmGtdhZ
const COLOR_VERY_DARK = '#42800B';
const COLOR_DARK = '#5EA222';
const COLOR_BASE = '#7ABD3F';
const COLOR_LIGHT = '#9EDB67';
const COLOR_VERY_LIGHT = '#BFEC97';

const COLOR_BLACK = '#222';
const COLOR_DARK_GREY = '#444';
const COLOR_VERY_LIGHT_GREY = '#EEE';
const COLOR_LIGHT_GREY = '#BBB';

const APP_BACKGROUND_COLOR = COLOR_VERY_LIGHT;
const APP_TEXT_COLOR = COLOR_DARK_GREY;
const DEFAULT_LINK_COLOR = COLOR_BLACK;
const RIVER_COLUMN_BACKGROUND_COLOR = COLOR_VERY_LIGHT_GREY;
const RIVER_TITLE_BACKGROUND_COLOR = COLOR_BASE;

const SANS_FONTS = [
  'AvenirNext-Medium',
  'HelveticaNeue-Medium',
  'Helvetica Neue',
  'Helvetica',
  'Arial',
  'sans-serif',
];

const RIVER_TITLE_FONT_SIZE = 24;
const ITEM_TITLE_FONT_SIZE = 18;
const TEXT_FONT_SIZE = 12;
const UPDATE_TITLE_FONT_SIZE = 12;

// ---- Sizes

const COLUMNWIDTH = 350;
const FULL_IMAGE_WIDTH = 300;
const COLUMNSPACER = 10;

// ---- Default Styles

const DEFAULT_LINK_STYLE = {
  color: DEFAULT_LINK_COLOR,
  textDecoration: 'initial',
};

// ---- Components

export const RiverItemTitle = ({item}) => {
  const style = Object.assign({}, DEFAULT_LINK_STYLE, {
    fontSize: ITEM_TITLE_FONT_SIZE,
  });
  return (
    <a style={style} href={ item.link }>
      { item.title }
    </a>
  );
}

export const RiverItemThumbnail = ({item}) => {
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
    if ((item.body || '').length > 140) {
      imgstyle.float = 'right';
      imgstyle.width = 100;
      imgstyle.height = 100;
    } else {
      imgstyle.width = FULL_IMAGE_WIDTH;
      imgstyle.height = FULL_IMAGE_WIDTH;
    }
    return <img style={imgstyle} src={thumb.url} />;
  } else {
    return <span />;
  }
}

export const RiverItem = ({item}) => {
  let style = {
    border: "1px solid AAA",
    overflow: 'auto',
  };

  return(
    <div style={style}>
      <RiverItemTitle item={item} />
      <div style={{float: 'clear'}} />
      <RiverItemThumbnail item={item} />
      <p>{ item.body }</p>
      <div style={{float: 'clear'}} />
    </div>
  );
};

const RiverFeedUpdateTitle = ({update}) => {
  const style = {
    fontSize: UPDATE_TITLE_FONT_SIZE,
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
    paddingLeft: 10,
    backgroundColor: RIVER_TITLE_BACKGROUND_COLOR,
    fontSize: RIVER_TITLE_FONT_SIZE,
  }
  return <h1 style={style}>{river.name}</h1>;
};

const RiverItems = ({river}) => {
  const TOP_SPACE = 65;
  const SIDE_PADDING = 3;

  let style = {
    maxHeight: '100%',
    overflowX: 'hidden',
    overflowY: 'auto',
    position: 'absolute',
    top: TOP_SPACE,
    bottom: SIDE_PADDING,
    left: SIDE_PADDING,
    right: SIDE_PADDING,
  };

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
  )
}

// RiverColumn
//
const RiverColumn = ({rivers, index}) => {
  let style = {
    width: COLUMNWIDTH,
    position: 'absolute',
    top: COLUMNSPACER,
    left: index * (COLUMNWIDTH + COLUMNSPACER) + COLUMNSPACER,
    backgroundColor: RIVER_COLUMN_BACKGROUND_COLOR,
    bottom: COLUMNSPACER,
    borderRadius: 10,
    border: '1px solid ' + COLOR_VERY_DARK,
  };

  let river = rivers[index] || {};
  return (
    <div style={style}>
      <RiverTitle river={river} />
      <RiverItems river={river} />
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
    height: '100%',
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
    <VisibleRiverSet />
  </div>;
};

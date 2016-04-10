var React = require('react');

export class RiverItem extends React.Component {
  render() {
    let style = {
      border: "1px solid AAA",
    };

    return(
      <div style={style}>
        <a href={ this.props.item.link }>
          <h4>{ this.props.item.title }</h4>
        </a>
        <p>{ this.props.item.body }</p>
      </div>
    );
  }
}

export class RiverFeedUpdate extends React.Component {
  render() {
    let style = {
      margin: 3,
    };

    let update = this.props.update;
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
  }
}

export class River extends React.Component {
  render() {
    let style = {
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "black",
      width: 400,
    };

    let river = this.props.river;
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
  }
}

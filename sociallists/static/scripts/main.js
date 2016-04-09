var React = require('react');
var ReactDOM = require('react-dom');
var Data = require('./data');

var RiverItem = React.createClass({
  render: function() {
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
});

var RiverFeedUpdate = React.createClass({
  render: function() {
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
});

var River = React.createClass({
  render: function() {
    let style = {
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "black",
      width: 400,
    };

    let river = this.props.river;
    let updates = river.updatedFeeds.updatedFeed;
    return (
      <div style={style}>{
        updates.map(u =>
          <RiverFeedUpdate
            update={u}
            key={ u.feedUrl + '|' + u.whenLastUpdate }
            />
        )
      }</div>
    );
  }
});

ReactDOM.render(
  <River river={Data.data} />,
  document.getElementById('example')
);

import { loadRiverAndFeeds } from './db';

function decodeUpdate(update) {
  let real_update = JSON.parse(update.data);

  // Fixup thumbnails..
  real_update.item.forEach((item) => {
    if (item.thumbnail) {
      let thumb = item.thumbnail;
      if (thumb.__blob) { thumb.url = 'sqlblob://' + thumb.__blob; }
    }
  });

  return real_update;
}

export function loadRiver(database, river_id) {
  const start = 0;
  const limit = 30;
  return loadRiverAndFeeds(database, river_id)
    .then((river) => {
      // flatten all the updates from each feed...
      let updates = [];
      river.feeds.forEach((feed) => {
        feed.updates.forEach((update) => {
          updates.push(update);
        });
      });
      updates.sort((a, b) => {
        if (a.update_time < b.update_time) { return +1; }
        if (a.update_time > b.update_time) { return -1; }
        return 0;
      });
      updates = updates.slice(start, limit);
      return {
          updatedFeeds: {
              updatedFeed: updates.map((u) => { return decodeUpdate(u); })
          },
          metadata: {
              docs: "http://riverjs.org/",
              mode: river.mode,
          },
      };
    });
}

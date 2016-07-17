import sqlite from 'sqlite3';
import Q from 'Q';

export function initializeDatabase(data_path) {
  return new sqlite.Database(data_path);
}

function dbError(table, err) {
  console.log("SQLite error", table, err);
  return {error: -2};
}

export function loadBlob(db, hash) {
  const defer = Q.defer();
  db.get("select * from blobs where hash = ?", hash, (err, row) => {
    if (err) { return defer.reject(dbError("blobs", err)); }
    if (!row) { return defer.reject(dbError("blobs", "not found")); }
    defer.resolve(row);
  });
  return defer.promise;
}

export function loadRiverDefinition(db, r_id) {
  const defer = Q.defer();
  db.get("select * from rivers where id = ?", r_id, (err, row) => {
    if (err) { return defer.reject(dbError("rivers", err)); }
    if (!row) { return defer.reject(dbError("rivers", "not found")); }

    defer.resolve(row);
  });
  return defer.promise;
}

export function loadFeedIdsForRiver(db, r_id) {
  const defer = Q.defer();
  db.all("select * from river_feeds where river_id = ?", r_id, (err, rows) => {
    if (err) { return defer.reject(dbError("river_feeds", err)); }
    defer.resolve(rows);
  });
  return defer.promise;
}

export function loadFeed(db, f_id) {
  const defer = Q.defer();
  db.get("select * from feeds where id = ?", f_id, (err, row) => {
    if (err) { return defer.reject(dbError("feeds", err)); }
    if (!row) { return defer.reject(dbError("feeds", "not found")); }

    defer.resolve(row);
  });
  return defer.promise;
}

export function loadFeedUpdates(db, f_id, limit) {
  limit = limit || 30;
  const defer = Q.defer();
  db.all(
    "select * from river_updates where feed_id = ? order by update_time desc limit ?",
    [ f_id, limit ],
    (err, rows) => {
      if (err) { return defer.reject(dbError("river_updates", err)); }
      defer.resolve(rows);
    }
  );
  return defer.promise;
}

export function loadRiverAndFeeds(db, river_id) {
  const load_river = loadRiverDefinition(db, river_id);
  const load_feeds = loadFeedIdsForRiver(db, river_id)
    .then((f_mappings) => {
      return f_mappings.map((feed_map) => {
        const feed_id = feed_map.feed_id;
        const load_feed = loadFeed(db, feed_id);
        const load_updates = loadFeedUpdates(db, feed_id);

        return Q.spread([load_feed, load_updates], (feed, updates) => {
          feed.updates = updates;
          return feed;
        });
      });
    });

  return Q.spread([load_river, load_feeds], (river, feeds) => {
    return Q.all(feeds).then((r) => {
      river.feeds = r;
      return river;
    });
  });
}

export function loadRiverList(db) {
  const defer = Q.defer();
  db.all("select * from rivers", (err, rows) => {
    if (err) { return defer.reject(dbError("rivers", err)); }
    defer.resolve(rows);
  });
  return defer.promise;
}

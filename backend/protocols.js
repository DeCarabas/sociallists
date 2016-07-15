import { app, protocol } from 'electron';
import sqlite from 'sqlite3';

export function registerProtocols(dataPath) {
  protocol.registerStandardSchemes(['sqlblob']);
  app.on('ready', () => {
    registerSQLiteBlobProtocol(dataPath);
  });
}

function registerSQLiteBlobProtocol(db_path) {
  const db = new sqlite.Database(db_path);
  protocol.registerBufferProtocol('sqlblob', (request, callback) => {
    let hash = request.url.substr(10);
    if (hash.endsWith('/')) {
      hash = hash.substr(0, hash.length-1);
    }

    db.get(
      "select contentType, data from blobs where hash = ?",
      hash,
      (err, row) => {
        if (err) {
          console.log("SQLite blob error: ", err);
          callback({error: -2});
        } else {
          console.log('sqlblob:', hash, 'ok:', row.contentType);
          callback({mimeType: row.contentType, data: row.data});
        }
      });
  });
}

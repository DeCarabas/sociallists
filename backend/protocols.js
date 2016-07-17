import { app, protocol } from 'electron';
import sqlite from 'sqlite3';
import { loadBlob } from './db';

export function registerProtocols(db) {
  protocol.registerStandardSchemes(['sqlblob']);
  app.on('ready', () => {
    registerSQLiteBlobProtocol(db);
  });
}

function registerSQLiteBlobProtocol(db) {
  protocol.registerBufferProtocol('sqlblob', (request, callback) => {
    let hash = request.url.substr(10);
    if (hash.endsWith('/')) {
      hash = hash.substr(0, hash.length-1);
    }

    console.time('sqlblob://' + hash);
    loadBlob(db, hash)
      .then((blob) => callback({mimeType: blob.contentType, data: blob.data}))
      .fail((error) => callback(error))
      .fin(() => { console.timeEnd('sqlblob://' + hash); })
      .done();
  });
}

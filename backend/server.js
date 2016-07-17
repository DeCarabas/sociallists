import { ipcMain } from 'electron';
import { loadRiver } from './rivers';
import { loadRiverList } from './db';
import {
  SVR_MSG_LOAD_RIVER,
  CLI_MSG_RIVER_LOAD_FAILURE,
  CLI_MSG_RIVER_LOAD_SUCCESS,

  SVR_MSG_LOAD_RIVER_LIST,
  CLI_MSG_LOAD_RIVER_LIST_SUCCESS,
  CLI_MSG_LOAD_RIVER_LIST_FAILURE,
} from '../messages';

export function startServer(database) {
  ipcMain.on(SVR_MSG_LOAD_RIVER, (event, arg) => {
    const river_id = arg.river_id;
    console.time('load_river:' + arg.river_id);
    loadRiver(database, river_id)
      .then((river) => {
        event.sender.send(CLI_MSG_RIVER_LOAD_SUCCESS, Object.assign({}, arg, {
          river: river,
        }));
      })
      .fail((error) => {
        event.sender.send(CLI_MSG_RIVER_LOAD_FAILURE, Object.assign({}, arg, {
          error: error,
        }));
      })
      .fin(() => { console.timeEnd('load_river:' + arg.river_id); })
      .done();
  });

  ipcMain.on(SVR_MSG_LOAD_RIVER_LIST, (event, arg) => {
    console.time('load_river_list');
    loadRiverList(database)
      .then((river_list) => event.sender.send(
        CLI_MSG_LOAD_RIVER_LIST_SUCCESS,
        Object.assign({}, arg, {
          rivers: river_list.map((r) => {
            return { name: r.name, url: '/wat/' + r.id, id: r.id };
          })
        })
      ))
      .fail((error) => event.sender.send(
        CLI_MSG_LOAD_RIVER_LIST_FAILURE,
        Object.assign({}, arg, { error: error })
      ))
      .fin(() => console.timeEnd('load_river_list'))
      .done();
  });
}

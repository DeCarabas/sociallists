import { ipcMain } from 'electron';
import { loadRiver } from './rivers';
import {
  SVR_MSG_LOAD_RIVER,
  CLI_MSG_RIVER_LOAD_FAILURE,
  CLI_MSG_RIVER_LOAD_SUCCESS
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
}

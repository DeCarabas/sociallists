import { ipcRenderer } from 'electron';
import { riverUpdateSuccess, riverUpdateFailed } from './actions';
import {
  SVR_MSG_LOAD_RIVER,
  CLI_MSG_RIVER_LOAD_FAILURE,
  CLI_MSG_RIVER_LOAD_SUCCESS
} from '../messages';

export function registerMessageHandlers(dispatch) {
  console.log('Starting IPC server...');
  ipcRenderer.on(CLI_MSG_RIVER_LOAD_SUCCESS, (event, args) => {
    dispatch(riverUpdateSuccess(
      args.context.index,
      args.context.river_name,
      args.context.river_url,
      args.river
    ));
  });

  ipcRenderer.on(CLI_MSG_RIVER_LOAD_FAILURE, (event, args) => {
    dispatch(riverUpdateFailed(args.context.index, args.error));
  });
}

export function sendLoadRiver(index, river_name, river_url, river_id) {
  ipcRenderer.send(SVR_MSG_LOAD_RIVER, {
    river_id: river_id,
    context: {
      index: index,
      river_name: river_name,
      river_url: river_url,
    },
  });
}

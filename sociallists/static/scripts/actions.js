export const TOGGLE_ADD_FEED_BOX = 'TOGGLE_ADD_FEED_BOX';
export function toggleAddFeedBox(index) {
  return {
    type: TOGGLE_ADD_FEED_BOX,
    index: index,
  }
}

export const RIVER_LIST_UPDATE_START = 'RIVER_LIST_UPDATE_START';
export function riverListUpdateStart() {
  return {
    type: RIVER_LIST_UPDATE_START,
  };
}

export const RIVER_LIST_UPDATE_SUCCESS = 'RIVER_LIST_UPDATE_SUCCESS';
export function riverListUpdateSuccess(response) {
  return {
    type: RIVER_LIST_UPDATE_SUCCESS,
    response: response,
  };
}

export const RIVER_LIST_UPDATE_FAILED = 'RIVER_LIST_UPDATE_FAILED';
export function riverListUpdateFailed(error) {
  return {
    type: RIVER_LIST_UPDATE_FAILED,
    error: error,
  };
}

export const RIVER_UPDATE_START = 'RIVER_UPDATE_START';
export function riverUpdateStart(index) {
  return {
    type: RIVER_UPDATE_START,
    index: index,
  };
}

export const RIVER_UPDATE_SUCCESS = 'RIVER_UPDATE_SUCCESS';
export function riverUpdateSuccess(index, name, url, response) {
  return {
    type: RIVER_UPDATE_SUCCESS,
    index: index,
    name: name,
    url: url,
    response: response,
  };
}

export const RIVER_UPDATE_FAILED = 'RIVER_UPDATE_FAILED';
export function riverUpdateFailed(index, error) {
  return {
    type: RIVER_UPDATE_FAILED,
    index: index,
    error: error,
  };
}

export function refreshRiver(index, river_name, river_url) {
  return function doRefreshRiver(dispatch) {
    dispatch(riverUpdateStart(index));
    var xhr = new XMLHttpRequest();
    xhr.open("GET", river_url, true);
    xhr.addEventListener("progress", (e) => {
      console.log("Progress", river_name);
      // TODO: Event for progress
    });
    xhr.addEventListener("load", (e) => {
      console.log("Loaded the river", river_name);
      const response = JSON.parse(xhr.responseText);
      // TODO: Error handling
      dispatch(riverUpdateSuccess(index, river_name, river_url, response));
    });
    xhr.addEventListener("error", (e) => {
      console.log("Error", river_name);
      dispatch(riverUpdateFailed(index, xhr.statusText));
    });
    xhr.addEventListener("abort", (e) => {
      console.log("Aborted", river_name);
      // TODO: Event for abort
    });
    xhr.send();
    console.log('Started', river_name);
  };
}

export function refreshRiverList() {
  return function doRefreshRiverList(dispatch) {
    dispatch(riverListUpdateStart());
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "api/v1/river/doty", true);
    xhr.addEventListener("progress", (e) => {
      console.log("Progress loading the river list");
      // TODO: Event for progress
    });
    xhr.addEventListener("load", (e) => {
      console.log("Loaded the river list");
      const response = JSON.parse(xhr.responseText);
      console.log(response);

      dispatch(riverListUpdateSuccess(response));
      response.rivers.forEach((river, index) => {
        dispatch(refreshRiver(index, river.name, river.url));
      });
    });
    xhr.addEventListener("error", (e) => {
      console.log("Error refreshing river list", xhr.statusText);
      dispatch(riverListUpdateFailed(xhr.statusText));
    });
    xhr.addEventListener("abort", (e) => {
      console.log("Aborted river list refresh");
      // TODO: Event for abort
    });
    xhr.send();
    console.log('Started refreshing river list');
  };
}

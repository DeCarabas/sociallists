export const TOGGLE_ADD_FEED_BOX = 'TOGGLE_ADD_FEED_BOX';
export function toggleAddFeedBox(index) {
  return {
    type: TOGGLE_ADD_FEED_BOX,
    index: index,
  }
}

export const RIVER_ADD_FEED_START = 'RIVER_ADD_FEED_START';
export function riverAddFeedStart(index) {
  return {
    type: RIVER_ADD_FEED_START,
    index: index,
  }
}

export const RIVER_ADD_FEED_SUCCESS = 'RIVER_ADD_FEED_SUCCESS';
export function riverAddFeedSuccess(index) {
  return {
    type: RIVER_ADD_FEED_SUCCESS,
    index: index,
  }
}

export const RIVER_ADD_FEED_FAILED = 'RIVER_ADD_FEED_FAILED';
export function riverAddFeedFailed(index) {
  return {
    type: RIVER_ADD_FEED_FAILED,
    index: index,
  }
}

export const RIVER_ADD_FEED_URL_CHANGED = 'RIVER_ADD_FEED_URL_CHANGED';
export function riverAddFeedUrlChanged(index, new_value) {
  return {
    type: RIVER_ADD_FEED_URL_CHANGED,
    index: index,
    new_value: new_value,
  };
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

export const REFRESH_ALL_FEEDS_START = 'REFRESH_ALL_FEEDS_START';
export function refreshAllFeedsStart() {
  return {
    type: REFRESH_ALL_FEEDS_START,
  };
}

export const REFRESH_ALL_FEEDS_PROGRESS = 'REFRESH_ALL_FEEDS_PROGRESS';
export function refreshAllFeedsProgress(percent) {
  return {
    type: REFRESH_ALL_FEEDS_PROGRESS,
    percent: percent,
  };
}

export const REFRESH_ALL_FEEDS_SUCCESS = 'REFRESH_ALL_FEEDS_SUCCESS';
export function refreshAllFeedsSuccess() {
  return {
    type: REFRESH_ALL_FEEDS_SUCCESS,
  };
}

export const REFRESH_ALL_FEEDS_ERROR = 'REFRESH_ALL_FEEDS_ERROR';
export function refreshAllFeedsError(error) {
  return {
    type: REFRESH_ALL_FEEDS_ERROR,
    error: error,
  };
}

function xhrAction(options) {
  return function doXHR(dispatch) {
    let xhr = new XMLHttpRequest();
    if (options.start) {
      options.start(dispatch, xhr);
    }
    xhr.open(options.verb || "GET", options.url, true);
    if (options.progress) {
      xhr.addEventListener("progress", () => options.progress(dispatch, xhr));
    }
    if (options.loaded_json) {
      xhr.addEventListener("load", () => {
        let result = JSON.parse(xhr.responseText);
        options.loaded_json(dispatch, result, xhr);
      });
    }
    if (options.loaded) {
      xhr.addEventListener("load", () => options.loaded(dispatch, xhr));
    }
    if (options.error) {
      xhr.addEventListener("error", () => options.error(dispatch, xhr));
    }
    if (options.abort) {
      xhr.addEventListener("abort", () => options.aborted(dispatch, xhr));
    }
    if (options.msg) {
      xhr.setRequestHeader("content-type", "application/json");
      xhr.send(JSON.stringify(options.msg));
    } else {
      xhr.send();
    }
  }
}

export function addFeedToRiver(index, river) {
  return xhrAction({
    verb: 'POST', url: river.url,
    msg: { 'url': river.modal.value },
    start: (dispatch) => dispatch(riverAddFeedStart(index)),
    loaded: (dispatch, xhr) => {
      dispatch(riverAddFeedSuccess(index));
      dispatch(refreshRiver(index, river.name, river.url));
    },
    error: (dispatch, xhr) => {
      dispatch(riverAddFeedFailed(index, xhr.statusText));
    },
  });
}

export function refreshRiver(index, river_name, river_url) {
  return xhrAction({
    url: river_url,
    start: (dispatch) => dispatch(riverUpdateStart(index)),
    loaded_json: (dispatch, result) =>
      dispatch(riverUpdateSuccess(index, river_name, river_url, result)),
    error: (dispatch, xhr) =>
      dispatch(riverUpdateFailed(index, xhr.statusText)),
  });
}

export function refreshRiverList() {
  return xhrAction({
    url: "api/v1/river/doty",
    start: (dispatch) => dispatch(riverListUpdateStart()),
    loaded_json: (dispatch, result) => {
      dispatch(riverListUpdateSuccess(result));
      result.rivers.forEach((river, index) => {
        dispatch(refreshRiver(index, river.name, river.url));
      });
    },
    error: (dispatch, xhr) => dispatch(riverListUpdateFailed(xhr.statusText)),
  });
}

export function refreshAllFeeds() {
  let pollTimer = null;
  return xhrAction({
    verb: "POST", url: "api/v1/river/doty/refresh_all",
    start: (dispatch, xhr) => {
      pollTimer = setInterval(() => {
        let text = xhr.responseText;
        if (text) {
          let lines = text.split('\n');
          let part = lines[lines.length - 1];
          if (part.length === 0 && lines.length > 1) {
            part = lines[lines.length - 2];
          }
          if (part.length > 0) {
            let percent = parseInt(part, '10');
            dispatch(refreshAllFeedsProgress(percent));
          }
        }
      }, 100);
      dispatch(refreshAllFeedsStart());
    },
    loaded: (dispatch, xhr) => {
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      dispatch(refreshAllFeedsSuccess());
      dispatch(refreshRiverList());
    },
    error: (dispatch, xhr) => {
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      dispatch(refreshAllFeedsError(xhr.statusText));
    },
  })
}

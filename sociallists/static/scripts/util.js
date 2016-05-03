export function assert(condition, message) {
  if (!condition) {
    debugger;
    console.log('Assertion failed: ', message);
    throw Error('Assertion failed', message);
  }
}

export function update_key(update) {
  return update.feedUrl + '|' + update.whenLastUpdate;
}

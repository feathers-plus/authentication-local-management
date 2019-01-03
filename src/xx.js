
const errors = require('@feathersjs/errors');

// history - a hook?
// [ [passwordFieldName, timestamp, hashedPassword] ] ordered newest change to oldest
function addPasswordToHistory(history = [], passwordField, timeStamp, hashedPassword, maxCount) {
  let count = 0;
  let lastEntry;

  history.forEach((entry, i) => {
    if (entry[0] === passwordField) {
      lastEntry = i;
      count =+ 1;

      if (entry[2] === hashedPassword) {
        throw new errors.BadRequest('Security code has been previously used. Use a new one.');
      }
    }
  });

  if (count > maxCount) {
    history.splice(lastEntry, 1);
  }

  history.unshift([passwordField, timeStamp, hashedPassword]);
  return history;
}
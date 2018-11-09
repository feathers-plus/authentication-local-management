
const cloneObject = require('./clone-object');

module.exports = sanitizeUserForNotifier;

function sanitizeUserForNotifier (user1, passwordField) {
  const user = cloneObject(user1);
  delete user[passwordField];
  return user;
}

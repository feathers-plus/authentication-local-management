
const cloneObject = require('./clone-object');

module.exports = sanitizeUserForClient;

function sanitizeUserForClient (user1, passwordField) {
  const user = cloneObject(user1);

  delete user[passwordField];
  delete user.verifyExpires;
  delete user.verifyToken;
  delete user.verifyShortToken;
  delete user.verifyChanges;
  delete user.resetExpires;
  delete user.resetToken;
  delete user.resetShortToken;

  return user;
}

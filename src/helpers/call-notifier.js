
const makeDebug = require('debug');
const sanitizeUserForNotifier = require('./sanitize-user-for-notifier');

const debug = makeDebug('authLocalMgnt:notifier');

module.exports = notifier;

function notifier (options, type, user, notifierOptions) {
  debug('notifier', type);
  options.notifier(type, sanitizeUserForNotifier(user, options.passwordField), notifierOptions || {});
  return user;
}

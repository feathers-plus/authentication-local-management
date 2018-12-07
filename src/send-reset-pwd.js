
const makeDebug = require('debug');
const concatIDAndHash = require('./helpers/concat-id-and-hash');
const ensureObjPropsValid = require('./helpers/ensure-obj-props-valid');
const getLongToken = require('./helpers/get-long-token');
const getShortToken = require('./helpers/get-short-token');
const getUserData = require('./helpers/get-user-data');
const callNotifier = require('./helpers/call-notifier');

const debug = makeDebug('authLocalMgnt:sendResetPwd');

module.exports = sendResetPwd;

async function sendResetPwd (options, identifyUser, notifierOptions, authUser, provider) {
  debug('sendResetPwd');
  const usersService = options.app.service(options.service);
  const usersServiceIdName = usersService.id;
  debug('id', usersService.id);

  ensureObjPropsValid(identifyUser, options.identifyUserProps);

  //const users = await usersService.find({ query: identifyUser, provider });
  const users = await options.customizeCalls.sendResetPwd
    .find(usersService, { query: identifyUser, provider });

  const user1 = getUserData(users,  options.skipIsVerifiedCheck ? [] : ['isVerified']);

  const user2 = Object.assign(user1, {
    resetExpires: Date.now() + options.resetDelay,
    resetToken: concatIDAndHash(
      user1[usersServiceIdName],
      await getLongToken(options.longTokenLen)
    ),
    resetShortToken: await getShortToken(options.shortTokenLen, options.shortTokenDigits),
  });

  await callNotifier(options, 'sendResetPwd', user2, notifierOptions)

  const user3 = await options.customizeCalls.sendResetPwd
    .patch(usersService, user2[usersServiceIdName], {
      resetExpires: user2.resetExpires,
      resetToken: user2.resetToken,
      resetShortToken: user2.resetShortToken,
    });

  return options.sanitizeUserForClient(user3, options.passwordField);
}

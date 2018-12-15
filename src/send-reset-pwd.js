
const makeDebug = require('debug');
const concatIDAndHash = require('./helpers/concat-id-and-hash');
const ensureObjPropsValid = require('./helpers/ensure-obj-props-valid');
const getUserData = require('./helpers/get-user-data');
const { getLongToken, getShortToken } = require('@feathers-plus/commons');

const debug = makeDebug('authLocalMgnt:sendResetPwd');

module.exports = sendResetPwd;

async function sendResetPwd (
  { options, plugins }, identifyUser, notifierOptions, authUser, provider
) {
  debug('sendResetPwd');
  const usersService = options.app.service(options.service);
  const usersServiceIdName = usersService.id;
  debug('id', usersService.id);

  ensureObjPropsValid(identifyUser, options.identifyUserProps);

  const users = await plugins.run('sendResetPwd.find', {
    usersService,
    params: { query: identifyUser },
  });

  const user1 = getUserData(users,  options.skipIsVerifiedCheck ? [] : ['isVerified']);

  const user2 = Object.assign(user1, {
    resetExpires: Date.now() + options.resetDelay,
    resetToken: concatIDAndHash(
      user1[usersServiceIdName],
      await getLongToken(options.longTokenLen)
    ),
    resetShortToken: await getShortToken(options.shortTokenLen, options.shortTokenDigits),
  });

  const user3 = await plugins.run('sanitizeUserForNotifier', user2);

  await plugins.run('notifier', {
    type: 'sendResetPwd',
    sanitizedUser: user3,
    notifierOptions,
  });

  const user4 = await plugins.run('sendResetPwd.patch', {
    usersService,
    id: user1[usersServiceIdName],
    data: {
      resetExpires: user2.resetExpires,
      resetToken: user2.resetToken,
      resetShortToken: user2.resetShortToken,
    },
  });

  return await plugins.run('sanitizeUserForClient', user4);
}


const makeDebug = require('debug');
const ensureObjPropsValid = require('./helpers/ensure-obj-props-valid');
const getUserData = require('./helpers/get-user-data');
const { getShortToken } = require('@feathers-plus/commons');

const debug = makeDebug('authLocalMgnt:sendResetPwd');


module.exports = sendMfa;

async function sendMfa (
  { options, plugins }, identifyUser, type, notifierOptions, authUser, provider
) {
  debug('sendMfa');
  const usersService = options.app.service(options.service);
  const usersServiceIdName = usersService.id;
  debug('id', usersService.id);

  ensureObjPropsValid(identifyUser, options.identifyUserProps);

  const users = await plugins.run('sendMfa.find', {
    usersService,
    params: { query: identifyUser },
  });

  const user1 = getUserData(users,  options.skipIsVerifiedCheck ? [] : ['isVerified']);

  const user2 = Object.assign(user1, {
    mfaExpires: Date.now() + options.resetDelay,
    mfaShortToken: await getShortToken(options.shortTokenLen, options.shortTokenDigits),
    mfaType: type,
  });

  const user3 = await plugins.run('sanitizeUserForNotifier', user2);

  await plugins.run('notifier', {
    type: 'sendMfa',
    sanitizedUser: user3,
    notifierOptions,
  });

  const user4 = await plugins.run('sendMfa.patch', {
    usersService,
    id: user1[usersServiceIdName],
    data: {
      mfaExpires: user2.mfaExpires,
      mfaShortToken: user2.mfaShortToken,
      mfaType: user2.mfaType,
    },
  });

  return await plugins.run('sanitizeUserForClient', user4);
}

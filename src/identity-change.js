
const errors = require('@feathersjs/errors');
const makeDebug = require('debug');
const ensureObjPropsValid = require('./helpers/ensure-obj-props-valid');
const getUserData = require('./helpers/get-user-data');
const { comparePasswords, getId, getLongToken, getShortToken } = require('@feathers-plus/commons');

const debug = makeDebug('authLocalMgnt:identityChange');

module.exports = identityChange;

async function identityChange (
  { options, plugins }, identifyUser, password, changesIdentifyUser, notifierOptions,
  authUser, provider
) {
  // note this call does not update the authenticated user info in hooks.params.user.
  debug('identityChange', password, changesIdentifyUser);
  const usersService = options.app.service(options.service);
  const usersServiceIdName = usersService.id;

  ensureObjPropsValid(identifyUser, options.userIdentityFields);
  ensureObjPropsValid(changesIdentifyUser, options.userIdentityFields);

  const users = await plugins.run('identityChange.find', {
    usersService,
    params: { query: identifyUser },
  });

  const user1 = getUserData(users);

  if (options.ownAcctOnly && authUser && (getId(authUser) !== getId(user1))) {
    throw new errors.BadRequest('Can only affect your own account.',
      { errors: { $className: 'not-own-acct' } }
    );
  }

  try {
    await comparePasswords(password, user1[options.passwordField], () => {}, options.bcryptCompare);
  } catch (err) {
    throw new errors.BadRequest('Password is incorrect.',
      { errors: { password: 'Password is incorrect.', $className: 'badParams' } }
    );
  }

  const user2 = await plugins.run('identityChange.patch', {
    usersService,
    id: user1[usersServiceIdName],
    data: {
      verifyExpires: Date.now() + options.verifyDelay,
      verifyToken: await getLongToken(options.longTokenLen),
      verifyShortToken: await getShortToken(options.shortTokenLen, options.shortTokenDigits),
      verifyChanges: changesIdentifyUser,
    },
  });

  const user3 = await plugins.run('sanitizeUserForNotifier', user2);

  const user4 = await plugins.run('notifier', {
    type: 'identityChange',
    sanitizedUser: user3,
    notifierOptions,
  });

  return await plugins.run('sanitizeUserForClient', user4);
}

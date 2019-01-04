
const errors = require('@feathersjs/errors');
const makeDebug = require('debug');
const ensureObjPropsValid = require('./helpers/ensure-obj-props-valid');
const getValidatedUser = require('./helpers/get-validated-user');
const { comparePasswords, getId, getLongToken, getShortToken } = require('@feathers-plus/commons');

const debug = makeDebug('authLocalMgnt:changeProtectedFields');

module.exports = changeProtectedFields;

async function changeProtectedFields (
  { options, plugins }, identifyUser, password, changesIdentifyUser, notifierOptions,
  authUser, provider
) {
  // note this call does not update the authenticated user info in hooks.params.user.
  debug('changeProtectedFields', password, changesIdentifyUser);
  const usersService = options.app.service(options.usersServicePath);
  const usersServiceIdName = usersService.id;

  ensureObjPropsValid(identifyUser, options.userIdentityFields);
  ensureObjPropsValid(changesIdentifyUser, options.userIdentityFields);

  const users = await plugins.run('changeProtectedFields.find', {
    usersService,
    params: { query: identifyUser },
  });

  const user1 = getValidatedUser(users);

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

  const user2 = await plugins.run('changeProtectedFields.patch', {
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
    type: 'changeProtectedFields',
    sanitizedUser: user3,
    notifierOptions,
  });

  return await plugins.run('sanitizeUserForClient', user4);
}

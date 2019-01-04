
const errors = require('@feathersjs/errors');
const makeDebug = require('debug');
const ensureObjPropsValid = require('./helpers/ensure-obj-props-valid');
const ensureValuesAreStrings = require('./helpers/ensure-values-are-strings');
const getValidatedUser = require('./helpers/get-validated-user');
const { comparePasswords, getId } = require('@feathers-plus/commons');

const debug = makeDebug('authLocalMgnt:passwordChange');

module.exports = passwordChange;

async function passwordChange (
  { options, plugins }, identifyUser, oldPassword, password, notifierOptions, authUser, provider
) {
  debug('passwordChange', oldPassword, password);
  const usersService = options.app.service(options.usersServicePath);
  const usersServiceIdName = usersService.id;

  ensureValuesAreStrings(oldPassword, password);
  ensureObjPropsValid(identifyUser, options.userIdentityFields);

  const users = await plugins.run('passwordChange.find', {
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
    await comparePasswords(oldPassword, user1[options.passwordField], () => {}, options.bcryptCompare);
  } catch (err) {
    throw new errors.BadRequest('Current password is incorrect.',
      { errors: { oldPassword: 'Current password is incorrect.' } }
    );
  }

  const user2 = await plugins.run('passwordChange.patch', {
    usersService,
    id: user1[usersServiceIdName],
    data: {
      [options.passwordField]: password,
    },
  });

  const user3 = await plugins.run('sanitizeUserForNotifier', user2);

  const user4 = await plugins.run('notifier', {
    type: 'passwordChange',
    sanitizedUser: user3,
    notifierOptions,
  });

  return await plugins.run('sanitizeUserForClient', user4);
}

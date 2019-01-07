
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
  const passwordField = options.passwordField;
  let user4;

  ensureValuesAreStrings(oldPassword, password);
  ensureObjPropsValid(identifyUser, options.userIdentityFields);

  const users = await plugins.run('passwordChange.find', {
    usersService,
    params: { query: identifyUser },
  });

  const user1 = getValidatedUser(users);

  if (options.ownAcctOnly && authUser && (getId(authUser) !== getId(user1))) {
    throw new errors.BadRequest('May only affect your own account.',
      { errors: { $className: 'not-own-acct' } }
    );
  }

  await comparePasswords(
    oldPassword,
    user1[options.passwordField],
    () => {
      throw new errors.BadRequest('Current password is incorrect.',
        { errors: { $className: 'badPassword' } }
      );
    },
    options.bcryptCompare
  );

  if (plugins.has('passwordHistoryExists')) {
    const exists = await plugins.run('passwordHistoryExists', {
      passwordHistory: user1.passwordHistory,
      passwordLikeField: options.passwordField,
      clearPassword: password,
    });
    console.log(`New password has${exists ? '' : ' NOT'} been used before.`);

    if (exists) {
      throw new errors.BadRequest('This password has been previously used. Try a new one.',
        {errors: {$className: 'repeatedPassword'}}
      );
    }
  }

  const user2 = await plugins.run('passwordChange.patch', {
    usersService,
    id: user1[usersServiceIdName],
    data: {
      [passwordField]: password,
    },
  });

  if (plugins.has('passwordHistoryAdd')) {
    // Reread the record as we don't know what was used to encode the password.
    const user3 = await plugins.run('passwordChange.get', {
      usersService,
      id: user2[usersServiceIdName],
    });


    // Add the new password to password history
    console.log('user3.passwordHistory was =', user3.passwordHistory);
    const passwordHistory = await plugins.run('passwordHistoryAdd', {
      passwordHistory: user3.passwordHistory,
      passwordLikeField: passwordField,
      hashedPassword: user3[passwordField],
    });
    console.log('user3.passwordHistory now =', passwordHistory);

    user4 = await plugins.run('passwordChange.patch', {
      usersService,
      id: user3[usersServiceIdName],
      data: { passwordHistory },
    });
  } else {
    user4 = user2;
  }

  const user5 = await plugins.run('sanitizeUserForNotifier', user4);

  const user6 = await plugins.run('notifier', {
    type: 'passwordChange',
    sanitizedUser: user5,
    notifierOptions,
  });

  return await plugins.run('sanitizeUserForClient', user6);
}

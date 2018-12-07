
const errors = require('@feathersjs/errors');
const makeDebug = require('debug');
const comparePasswords = require('./helpers/compare-passwords');
const ensureObjPropsValid = require('./helpers/ensure-obj-props-valid');
const ensureValuesAreStrings = require('./helpers/ensure-values-are-strings');
const getId = require('./helpers/get-id');
const getUserData = require('./helpers/get-user-data');
const callNotifier = require('./helpers/call-notifier');

const debug = makeDebug('authLocalMgnt:passwordChange');

module.exports = passwordChange;

async function passwordChange (
  options, identifyUser, oldPassword, password, notifierOptions, authUser, provider
) {
  console.log('\npasswordChange', notifierOptions);
  debug('passwordChange', oldPassword, password);
  const usersService = options.app.service(options.service);
  const usersServiceIdName = usersService.id;

  ensureValuesAreStrings(oldPassword, password);
  ensureObjPropsValid(identifyUser, options.identifyUserProps);

  const users = await options.customizeCalls.passwordChange
    .find(usersService, { query: identifyUser });
  const user1 = getUserData(users);

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

  const user2 = await options.customizeCalls.passwordChange
    .patch(usersService, user1[usersServiceIdName], { [options.passwordField]: password });

  const user3 = await callNotifier(options, 'passwordChange', user2, notifierOptions);
  return options.sanitizeUserForClient(user3, options.passwordField);
}

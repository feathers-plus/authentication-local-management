
const errors = require('@feathersjs/errors');
const makeDebug = require('debug');
const comparePasswords = require('./helpers/compare-passwords');
const deconstructId = require('./helpers/deconstruct-id');
const ensureObjPropsValid = require('./helpers/ensure-obj-props-valid');
const ensureValuesAreStrings = require('./helpers/ensure-values-are-strings');
const getUserData = require('./helpers/get-user-data');
const callNotifier = require('./helpers/call-notifier');

const debug = makeDebug('authLocalMgnt:resetPassword');

module.exports = {
  resetPwdWithLongToken,
  resetPwdWithShortToken,
};

async function resetPwdWithLongToken(options, resetToken, password, authUser, provider) {
  ensureValuesAreStrings(resetToken, password);

  return await resetPassword(options, { resetToken }, { resetToken }, password, authUser, provider);
}

async function resetPwdWithShortToken(options, resetShortToken, identifyUser, password, authUser, provider) {
  ensureValuesAreStrings(resetShortToken, password);
  ensureObjPropsValid(identifyUser, options.identifyUserProps);

  return await resetPassword(options, identifyUser, { resetShortToken }, password, authUser, provider);
}

async function resetPassword (options, query, tokens, password, authUser, provider) {
  debug('resetPassword', query, tokens, password);
  const usersService = options.app.service(options.service);
  const usersServiceIdName = usersService.id;
  const promises = [];
  let users;

  if (tokens.resetToken) {
    let id = deconstructId(tokens.resetToken);
    users = await options.customizeCalls.resetPassword
      .resetTokenGet(usersService, id);
  } else if (tokens.resetShortToken) {
    users = await options.customizeCalls.resetPassword
      .resetShortTokenFind(usersService, { query });
  } else {
    throw new errors.BadRequest('resetToken and resetShortToken are missing. (authLocalMgnt)',
      { errors: { $className: 'missingToken' } }
    );
  }

  const checkProps = options.skipIsVerifiedCheck ?
    ['resetNotExpired'] : ['resetNotExpired', 'isVerified'];
  const user1 = getUserData(users, checkProps);

  Object.keys(tokens).forEach((key) => {
    promises.push(comparePasswords(tokens[key], user1[key], () =>
      new errors.BadRequest('Reset Token is incorrect. (authLocalMgnt)',
        { errors: { $className: 'incorrectToken' } })
    ), options.bcryptCompare);
  });

  try {
    await Promise.all(promises);
  } catch (err) {
    await options.customizeCalls.resetPassword
      .badTokenpatch(usersService, user1[usersServiceIdName], {
        resetToken: null,
        resetShortToken: null,
        resetExpires: null
      });

    new errors.BadRequest('Invalid token. Get for a new one. (authLocalMgnt)',
      { errors: { $className: 'invalidToken' } }
    );
  }

  const user2 = await options.customizeCalls.resetPassword
    .patch(usersService, user1[usersServiceIdName], {
      [options.passwordField]: password,
      resetToken: null,
      resetShortToken: null,
      resetExpires: null
    });

  const user3 = await callNotifier(options, 'resetPwd', user2);
  return options.sanitizeUserForClient(user3, options.passwordField);
}

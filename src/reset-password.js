
const errors = require('@feathersjs/errors');
const makeDebug = require('debug');
const deconstructId = require('./helpers/deconstruct-id');
const ensureObjPropsValid = require('./helpers/ensure-obj-props-valid');
const ensureValuesAreStrings = require('./helpers/ensure-values-are-strings');
const getUserData = require('./helpers/get-user-data');
const { comparePasswords } = require('@feathers-plus/commons');

const debug = makeDebug('authLocalMgnt:resetPassword');

module.exports = {
  resetPwdWithLongToken,
  resetPwdWithShortToken,
};

async function resetPwdWithLongToken(
  pluginsContext, resetToken, password,  notifierOptions, authUser, provider
) {
  ensureValuesAreStrings(resetToken, password);

  return await resetPassword(
    pluginsContext, { resetToken }, { resetToken }, password,  notifierOptions, authUser, provider
  );
}

async function resetPwdWithShortToken(
  pluginsContext, resetShortToken, identifyUser, password,  notifierOptions, authUser, provider
) {
  ensureValuesAreStrings(resetShortToken, password);
  ensureObjPropsValid(identifyUser, pluginsContext.options.userIdentityFields);

  return await resetPassword(
    pluginsContext, identifyUser, { resetShortToken }, password,  notifierOptions, authUser, provider
  );
}

async function resetPassword (
  { options, plugins }, query, tokens, password,  notifierOptions, authUser, provider
) {
  debug('resetPassword', query, tokens, password);
  const usersService = options.app.service(options.service);
  const usersServiceIdName = usersService.id;
  const promises = [];
  let users;

  if (tokens.resetToken) {
    let id = deconstructId(tokens.resetToken);

    users = await plugins.run('resetPassword.tokenGet', {
      usersService,
      id,
    });
  } else if (tokens.resetShortToken) {
    users = await plugins.run('resetPassword.shortTokenFind', {
      usersService,
      params: { query },
    });
  } else {
    throw new errors.BadRequest('resetToken and resetShortToken are missing. (authLocalMgnt)',
      { errors: { $className: 'incorrectToken' } }
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
    await plugins.run('resetPassword.badTokenPatch', {
      usersService,
      id: user1[usersServiceIdName],
      data: {
        resetToken: null,
        resetShortToken: null,
        resetExpires: null,
      },
    });

    new errors.BadRequest('Invalid token. Get for a new one. (authLocalMgnt)',
      { errors: { $className: 'incorrectToken' } }
    );
  }

  const user2 = await plugins.run('resetPassword.patch', {
    usersService,
    id: user1[usersServiceIdName],
    data: {
      [options.passwordField]: password,
      resetToken: null,
      resetShortToken: null,
      resetExpires: null,
    },
  });

  const user3 = await plugins.run('sanitizeUserForNotifier', user2);

  const user4 = await plugins.run('notifier', {
    type: 'resetPwd',
    sanitizedUser: user3,
    notifierOptions,
  });

  return await plugins.run('sanitizeUserForClient', user4);
}

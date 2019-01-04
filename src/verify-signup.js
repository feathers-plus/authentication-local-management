
const errors = require('@feathersjs/errors');
const makeDebug = require('debug');
const ensureObjPropsValid = require('./helpers/ensure-obj-props-valid');
const ensureValuesAreStrings = require('./helpers/ensure-values-are-strings');
const getValidatedUser = require('./helpers/get-validated-user');

const debug = makeDebug('authLocalMgnt:verifySignup');

module.exports = {
  verifySignupWithLongToken,
  verifySignupWithShortToken,
};

async function verifySignupWithLongToken(
  pluginsContext, verifyToken, newPassword, notifierOptions, authUser, provider
) {
  ensureValuesAreStrings(verifyToken);

  return await verifySignup(
    pluginsContext, { verifyToken }, { verifyToken }, newPassword, notifierOptions, authUser, provider
  );
}

async function verifySignupWithShortToken(
  pluginsContext, verifyShortToken, identifyUser, notifierOptions, authUser, provider
) {
  ensureValuesAreStrings(verifyShortToken);
  ensureObjPropsValid(identifyUser, pluginsContext.options.userIdentityFields);

  return await verifySignup(pluginsContext, identifyUser, { verifyShortToken },
    null, notifierOptions, authUser, provider);
}

async function verifySignup (
  { options, plugins }, query, tokens, newPassword, notifierOptions, authUser, provider
) {
  debug('verifySignup', query, tokens);
  const usersService = options.app.service(options.usersServicePath);
  const usersServiceIdName = usersService.id;

  const users = await plugins.run('verifySignup.find', {
    usersService,
    params: { query },
  });

  const user1 = getValidatedUser(users, ['isNotVerifiedOrHasVerifyChanges', 'verifyNotExpired']);

  if (!Object.keys(tokens).every(key => tokens[key] === user1[key])) {
    await eraseVerifyProps(user1, user1.isVerified, user1.isInvitation);

    throw new errors.BadRequest('Invalid token. Get for a new one. (authLocalMgnt)',
      { errors: { $className: 'badParam' } }
    );
  }

  const user2 = await eraseVerifyProps(
    user1, user1.verifyExpires > Date.now(), user1.isInvitation, user1.verifyChanges
    );

  const user3 = await plugins.run('sanitizeUserForNotifier', user2);

  const user4 = await plugins.run('notifier', {
    type: 'verifySignup',
    sanitizedUser: user3,
    notifierOptions,
  });

  return await plugins.run('sanitizeUserForClient', user4);

  async function eraseVerifyProps (user, isVerified, isInvitation, verifyChanges = {}) {
    const patchToUser = Object.assign({}, verifyChanges, {
      isInvitation: isVerified ? false : isInvitation,
      isVerified,
      verifyToken: null,
      verifyShortToken: null,
      verifyExpires: null,
      verifyChanges: {}
    });

    // Change password if processing an invited user
    if (isInvitation && newPassword) {
      patchToUser[options.passwordField] = newPassword;
    }

    return await plugins.run('verifySignup.patch', {
      usersService,
      id: user1[usersServiceIdName],
      data: patchToUser,
    });
  }
}

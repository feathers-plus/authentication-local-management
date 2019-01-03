
const bcrypt = require('bcryptjs');
const errors = require('@feathersjs/errors');
const makeDebug = require('debug');
const merge = require('lodash.merge');
const Plugins = require('../../plugin-scaffolding/src');
const { authenticate } = require('@feathersjs/authentication').hooks;
const checkUnique = require('./check-unique');
const identityChange = require('./identity-change');
const passwordChange = require('./password-change');
const resendVerifySignup = require('./resend-verify-signup');
const pluginsDefault = require('./plugins-default');
const pluginsExtensions = require('./plugins-extensions');
const sendResetPwd = require('./send-reset-pwd');
const { resetPwdWithLongToken, resetPwdWithShortToken } = require('./reset-password');
const { verifySignupWithLongToken, verifySignupWithShortToken } = require('./verify-signup');

const debug = makeDebug('authLocalMgnt:service');
let plugins;

const optionsDefault = {
  almServicePath: 'localManagement',

  /* These fields are overridden by config/default.json */
  usersServicePath: '/users', // authentication.serviceNeed. Need default '/users' for test suite.
  passwordField: 'password', // authentication.local.passwordField. Change with passwordChange.
  /* Token lengths */
  longTokenLen: 15, // Len * 0.5. sendResetPwd len is 2 * longTokenLen + users.id.length + 3.
  shortTokenLen: 6,
  shortTokenDigits: true,
  /* Token durations */
  verifyDelay: 1000 * 60 * 60 * 24 * 5, // 5 days for re/sendVerifySignup
  resetDelay: 1000 * 60 * 60 * 2, // 2 hours for sendResetPwd
  mfaDelay: 1000 * 60 * 60, // 1 hour for sendMfa

  // identityChange -> changeProtectedUserFields
  // number of old passwords to retain for each passwordField
  // countEachPasswordHistory
  // passwordHistory: array of arrays
  // [nameField, passwordHash, timestamp]
  //

  /* These fields in users may be changed only with the changeProtectedUserFields command. */
  userIdentityFields: [ // Fields uniquely identifying the user.
    'email', 'dialablePhone'
  ],
  userExtraPasswordFields: [ // Extra password-like fields to hash in addition to passwordField.
    // e.g. 'pin', 'badge'
  ],
  userProtectedFields: [ // Other protected fields.
    // e.g. 'userIssuingInvitation'
  ],

  /* Unauthenticated users may run these commands */
  commandsNoAuth: [
    'resendVerifySignup', 'verifySignupLong', 'verifySignupShort',
    'sendResetPwd', 'resetPwdLong', 'resetPwdShort',
  ],

  /* Fields used by the notifier. */
  notifierEmailField: 'email',
  notifierDialablePhoneField: 'dialablePhone', // also needs to be coded in dialablePhoneNumber hook.

  ownAcctOnly: true,
  bcryptCompare: bcrypt.compare,
  /* Values set during configuration */
  app: null, // Replaced by Feathers app.
  plugins: null, // Replaced by instantiated Plugins class during configuration.
};

module.exports = authenticationLocalManagement;

function authenticationLocalManagement(options1 = {}) {
  debug('service being configured.');

  return function (app) {
    // Get default options
    const authConfig = app.get('authentication') || {};

    let options = Object.assign({}, optionsDefault, {
      app,
      usersServicePath: authConfig.service || optionsDefault.usersServicePath,
      passwordField: (authConfig.local || {}).passwordField || optionsDefault.passwordField,
    });

    // Load plugins. They may add additional default options.
    const pluginsContext = { options };
    plugins = new Plugins(pluginsContext);
    plugins.register(pluginsDefault);
    plugins.register(pluginsExtensions);

    if (options1.plugins) {
      plugins.register(options1.plugins);
    }

    (async function() {
      await plugins.setup();
    }());

    // Get final options
    options =  Object.assign(options, options1, { plugins });
    options.userExtraPasswordFields = [options.passwordField].concat(options.userExtraPasswordFields);
    pluginsContext.options = options;

    // Store optiona
    app.set('localManagement', options);

    // Configure custom service
    options.app.use(options.almServicePath, authLocalMgntMethods(options, plugins));
  };
}

function authLocalMgntMethods(options, plugins) {
  return {
    async create (data) {
      const trigger = data.action;
      debug(`create called. trigger=${trigger}`);

      if (!plugins.has(trigger)) {
        return Promise.reject(
          new errors.BadRequest(`Action '${trigger}' is invalid.`,
            { errors: { $className: 'badParams' } }
          )
        );
      }

      try {
        return await plugins.run(trigger, data);
      } catch (err) {
        return await plugins.run('catchError', err);
      }
    }
  }
}

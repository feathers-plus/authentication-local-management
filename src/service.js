
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
  app: null, // Value set during configuration.
  service: '/users', // Need exactly this for test suite. Overridden by config/default.json.
  path: 'authManagement',
  emailField: 'email',
  dialablePhoneField: 'dialablePhone',
  passwordField: 'password', //  Overridden by config/default.json.
  // Token's length will be twice longTokenLen by default.
  // The token for sendResetPwd will be twice LongTokenLen + length of (id || _id) + 3
  longTokenLen: 15,
  shortTokenLen: 6,
  shortTokenDigits: true,
  delay: 1000 * 60 * 60 * 24 * 5, // 5 days for re/sendVerifySignup
  resetDelay: 1000 * 60 * 60 * 2, // 2 hours for sendResetPwd
  mfaDelay: 1000 * 60 * 60 * 1, // 1 hour for sendMfa
  identifyUserProps: [
    'email', 'dialablePhone'
  ],
  actionsNoAuth: [
    'resendVerifySignup', 'verifySignupLong', 'verifySignupShort',
    'sendResetPwd', 'resetPwdLong', 'resetPwdShort',
  ],
  ownAcctOnly: true,
  bcryptCompare: bcrypt.compare,
  plugins: null, // Replaced by instantiated Plugins class during configuration.
};

module.exports = authenticationLocalManagement;

function authenticationLocalManagement(options1 = {}) {
  debug('service being configured.');

  return function (app) {
    // Get default options
    const authOptions = app.get('authentication') || {};

    let options = Object.assign({}, optionsDefault, {
      app,
      service: authOptions.service || optionsDefault.service,
      passwordField: (authOptions.local || {}).passwordField || optionsDefault.passwordField,
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
    pluginsContext.options = options =  Object.assign(options, options1, { plugins });

    // Store optiona
    app.set('localManagement', options);

    // Configure custom service
    options.app.use(options.path, authLocalMgntMethods(options, plugins));
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

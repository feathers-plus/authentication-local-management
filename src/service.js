
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
const sanitizeUserForClient = require('./helpers/sanitize-user-for-client');
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
  notifier: (app, options) => async (type, sanitizedUser, notifierOptions) => {
    // console.log('a-l-m default notifier called', type, sanitizedUser, notifierOptions);
  },
  buildEmailLink,
  // Token's length will be twice longTokenLen by default.
  // The token for sendResetPwd will be twice LongTokenLen + length of (id || _id) + 3
  longTokenLen: 15,
  shortTokenLen: 6,
  shortTokenDigits: true,
  resetDelay: 1000 * 60 * 60 * 2, // 2 hours
  delay: 1000 * 60 * 60 * 24 * 5, // 5 days
  identifyUserProps: ['email', 'dialablePhone'],
  actionsNoAuth: [
    'resendVerifySignup', 'verifySignupLong', 'verifySignupShort',
    'sendResetPwd', 'resetPwdLong', 'resetPwdShort',
  ],
  ownAcctOnly: true,
  sanitizeUserForClient,
  bcryptCompare: bcrypt.compare,
};

function buildEmailLink(app, actionToVerb) {
  const isProd = process.env.NODE_ENV === 'production';
  const port = (app.get('port') === '80' || isProd) ? '' : `:${app.get('port')}`;
  const host = (app.get('host') === 'HOST')? 'localhost': app.get('host');
  const protocol = (app.get('protocol') === 'PROTOCOL')? 'http': app.get('protocol') || 'http';
  const url = `${protocol}://${host}${port}/`;

  actionToVerb = {
    sendVerifySignup: 'verify',
    resendVerifySignup: 'verify',
    sendResetPwd: 'reset',
  };

  return (type, hash) => {
    return `${url}${actionToVerb[type] || type}/${hash}`;
  };
}

module.exports = authenticationLocalManagement;

function authenticationLocalManagement(options1 = {}) {
  debug('service being configured.');

  return function (app) {
    // Get defaults from config/default.json
    const authOptions = app.get('authentication') || {};
    optionsDefault.service = authOptions.service || optionsDefault.service;
    optionsDefault.passwordField =
      (authOptions.local || {}).passwordField || optionsDefault.passwordField;

    let options = Object.assign({}, optionsDefault, options1, { app });
    //options.customizeCalls = merge({}, optionsCustomizeCalls, options1.customizeCalls || {});
    options.notifier = options.notifier(app, options);

    // Load plugins
    plugins = new Plugins({ options });
    plugins.register(pluginsDefault);
    (async function() {
      await plugins.setup();
    }());

    app.set('localManagement', options);

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

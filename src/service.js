
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
  bcryptCompare: bcrypt.compare,
  plugins: null,
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

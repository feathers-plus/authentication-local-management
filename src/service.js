
const bcrypt = require('bcryptjs');
const errors = require('@feathersjs/errors');
const makeDebug = require('debug');
const merge = require('lodash.merge');
const { authenticate } = require('@feathersjs/authentication').hooks;
const checkUnique = require('./check-unique');
const identityChange = require('./identity-change');
const passwordChange = require('./password-change');
const resendVerifySignup = require('./resend-verify-signup');
const sanitizeUserForClient = require('./helpers/sanitize-user-for-client');
const sendResetPwd = require('./send-reset-pwd');
const { resetPwdWithLongToken, resetPwdWithShortToken } = require('./reset-password');
const { verifySignupWithLongToken, verifySignupWithShortToken } = require('./verify-signup');

const debug = makeDebug('authLocalMgnt:service');
const actionsNoAuth = [
  'resendVerifySignup', 'verifySignupLong', 'verifySignupShort',
  'sendResetPwd', 'resetPwdLong', 'resetPwdShort',
];

const optionsDefault = {
  app: null, // Value set during configuration.
  service: '/users', // Need exactly this for test suite. Overridden by config/default.json.
  path: 'authManagement',
  passwordField: 'password', //  Overridden by config/default.json.
  notifier: async () => () => {},
  buildEmailLink,
  longTokenLen: 15, // Token's length will be twice this by default.
  shortTokenLen: 6,
  shortTokenDigits: true,
  resetDelay: 1000 * 60 * 60 * 2, // 2 hours
  delay: 1000 * 60 * 60 * 24 * 5, // 5 days
  identifyUserProps: ['email'],
  actionsNoAuth: [
    'resendVerifySignup', 'verifySignupLong', 'verifySignupShort',
    'sendResetPwd', 'resetPwdLong', 'resetPwdShort',
  ],
  ownAcctOnly: true,
  sanitizeUserForClient,
  bcryptCompare: bcrypt.compare,
  catchErr: (err, options, data) => {
    return Promise.reject(err); // support both async and Promise interfaces
  },
  customizeCalls: null, // Value set during configuration.
  // Need option URL for notifier emails e.g. 'http://localhost:3030/' + type + '?token=' + hash ?????????????????????
  // emailLink: (action, slug) => 'http://localhost:3030/' + type + '?token=' + slug, ????????????????????????????
};

/* Call options.customizeCalls using
const users = await options.customizeCalls.identityChange
  .find(usersService, { query: identifyUser });

const user2 = await options.customizeCalls.identityChange
  .patch(usersService, user1[usersServiceIdName], {

});
*/

function buildEmailLink(app) {
  const isProd = process.env.NODE_ENV === 'production';
  const port = (app.get('port') === '80' || isProd) ? '' : `:${app.get('port')}`;
  const host = (app.get('host') === 'HOST')? 'localhost': app.get('host');
  const protocol = (app.get('protocol') === 'PROTOCOL')? 'http': app.get('protocol');
  const url = `${protocol}://${host}${port}/`;

  const actionToSlug = {
    aaa: 'aaa',
  };

  return (type, hash) => {
    return `${url}${type}/${hash}`;
  };
}

const  optionsCustomizeCalls = {
  checkUnique: {
    find: async (usersService, params = {}) =>
      await usersService.find(params),
  },
  identityChange: {
    find: async (usersService, params = {}) =>
      await usersService.find(params),
    patch: async (usersService, id, data, params = {}) =>
      await usersService.patch(id, data, params),
  },
  passwordChange: {
    find: async (usersService, params = {}) =>
      await usersService.find(params),
    patch: async (usersService, id, data, params = {}) =>
      await usersService.patch(id, data, params),
  },
  resendVerifySignup: {
    find: async (usersService, params = {}) =>
      await usersService.find(params),
    patch: async (usersService, id, data, params = {}) =>
      await usersService.patch(id, data, params),
  },
  resetPassword: {
    resetTokenGet: async (usersService, id, params) =>
      await usersService.get(id, params),
    resetShortTokenFind: async (usersService, params = {}) =>
      await usersService.find(params),
    badTokenpatch: async (usersService, id, data, params = {}) =>
      await usersService.patch(id, data, params),
    patch: async (usersService, id, data, params = {}) =>
      await usersService.patch(id, data, params),
  },
  sendResetPwd: {
    find: async (usersService, params = {}) => await usersService.find(params),
    patch: async (usersService, id, data, params = {}) =>
      await usersService.patch(id, data, params),
  },
  verifySignup: {
    find: async (usersService, params = {}) =>
      await usersService.find(params),
    patch: async (usersService, id, data, params = {}) =>
      await usersService.patch(id, data, params),
  },
};

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
    options.notifier = options.notifier(app);
    options.customizeCalls = merge({}, optionsCustomizeCalls, options1.customizeCalls || {});

    app.set('localManagement', options);

    options.app.use(options.path, authLocalMgntMethods(options));
  };
}

function authLocalMgntMethods(options) {
  return {
    async create (data) {
      debug(`create called. action=${data.action}`);

      try {
        switch (data.action) {
          case 'checkUnique':
            return await checkUnique(
              options, data.value, data.ownId || null, data.meta || {},
              data.authUser, data.provider
              );
          case 'resendVerifySignup':
            return await resendVerifySignup(
              options, data.value, data.notifierOptions,
              data.authUser, data.provider
            );
          case 'verifySignupLong':
            return await verifySignupWithLongToken(
              options, data.value,
              data.authUser, data.provider
            );
          case 'verifySignupShort':
            return await verifySignupWithShortToken(
              options, data.value.token, data.value.user,
              data.authUser, data.provider
            );
          case 'sendResetPwd':
            return await sendResetPwd(
              options, data.value, data.notifierOptions,
              data.authUser, data.provider
            );
          case 'resetPwdLong':
            return await resetPwdWithLongToken(
              options, data.value.token, data.value.password,
              data.authUser, data.provider
            );
          case 'resetPwdShort':
            return await resetPwdWithShortToken(
              options, data.value.token, data.value.user, data.value.password,
              data.authUser, data.provider
            );
          case 'passwordChange':
            return await passwordChange(
              options, data.value.user, data.value.oldPassword, data.value.password,
              data.authUser, data.provider
            );
          case 'identityChange':
            return await identityChange(
              options, data.value.user, data.value.password, data.value.changes,
              data.authUser, data.provider
            );
          default:
            return Promise.reject(
              new errors.BadRequest(`Action '${data.action}' is invalid.`,
                { errors: { $className: 'badParams' } }
              )
            );
        }
      } catch (err) {
        return options.catchErr(err, options, data);
      }
    }
  }
}

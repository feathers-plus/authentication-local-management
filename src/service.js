
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
  'sendResetPwd', 'resetPwdLong', 'resetPwdShort'
];

const optionsDefault = {
  app: null, // Value set during configuration.
  service: '/users', // Need exactly this for test suite. Overridden by config/default.json.
  path: 'authManagement',
  passwordField: 'password', //  Overridden by config/default.json.
  notifier: async () => {},
  longTokenLen: 15, // Token's length will be twice this by default.
  shortTokenLen: 6,
  shortTokenDigits: true,
  resetDelay: 1000 * 60 * 60 * 2, // 2 hours
  delay: 1000 * 60 * 60 * 24 * 5, // 5 days
  identifyUserProps: ['email'],
  ownAcctOnly: true,
  sanitizeUserForClient,
  bcryptCompare: bcrypt.compare,
  authManagementHooks: { before: { create: authManagementHook } },
  customizeCalls: null, // Value set during configuration.
};

async function authManagementHook(context) {
  if (!context.data || !actionsNoAuth.includes(context.data.action)) {
    context = await authenticate('jwt')(context);
  }

  context.data.authUser = context.params.user;
  return context;
}

/* Call options.customizeCalls using
const users = await options.customizeCalls.identityChange
  .find(usersService, { query: identifyUser });

const user2 = await options.customizeCalls.identityChange
  .patch(usersService, user1[usersServiceIdName], {

});
*/

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
    find: async (usersService, params = {}) =>
      await usersService.find(params),
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

  return function () {
    const app = this;

    // Get defaults from config/default.json
    const authOptions = app.get('authentication') || {};
    optionsDefault.service = authOptions.service || optionsDefault.service;
    optionsDefault.passwordField =
      (authOptions.local || {}).passwordField || optionsDefault.passwordField;

    const options = Object.assign({}, optionsDefault, options1, { app });
    options.customizeCalls = merge({}, optionsCustomizeCalls, options1.customizeCalls || {});

    options.app.use(options.path, authLocalMgntMethods(options));

    app.service('authManagement').hooks(options.authManagementHooks)
  };
}

function authLocalMgntMethods(options) {
  return {
    async create (data) {
      debug(`create called. action=${data.action}`);

      // ******************** eliminate rec.id || rec._id checking in favor of getId() *************
      try {
        switch (data.action) {
          case 'checkUnique':
            return await checkUnique(
              options, data.value, data.ownId || null, data.meta || {}, data.authUser
              );
          case 'resendVerifySignup':
            return await resendVerifySignup(
              options, data.value, data.notifierOptions, data.authUser
            );
          case 'verifySignupLong':
            return await verifySignupWithLongToken(
              options, data.value, data.authUser
            );
          case 'verifySignupShort':
            return await verifySignupWithShortToken(
              options, data.value.token, data.value.user, data.authUser
            );
          case 'sendResetPwd':
            return await sendResetPwd(
              options, data.value, data.notifierOptions, data.authUser
            );
          case 'resetPwdLong':
            return await resetPwdWithLongToken(
              options, data.value.token, data.value.password, data.authUser
            );
          case 'resetPwdShort':
            return await resetPwdWithShortToken(
              options, data.value.token, data.value.user, data.value.password, data.authUser
            );
          case 'passwordChange':
            return await passwordChange(
              options, data.value.user, data.value.oldPassword, data.value.password, data.authUser
            );
          case 'identityChange':
            return await identityChange(
              options, data.value.user, data.value.password, data.value.changes, data.authUser
            );
          case 'options':
            return options;
          default:
            return Promise.reject(
              new errors.BadRequest(`Action '${data.action}' is invalid.`,
                { errors: { $className: 'badParams' } }
              )
            );
        }
      } catch (err) {
        return Promise.reject(err); // support both async and Promise interfaces
      }
    }
  }
}

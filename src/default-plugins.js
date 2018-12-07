
const checkUnique = require('./check-unique');
const identityChange = require('./identity-change');
const passwordChange = require('./password-change');
const resendVerifySignup = require('./resend-verify-signup');
const sanitizeUserForClient = require('./helpers/sanitize-user-for-client');
const sendResetPwd = require('./send-reset-pwd');
const { resetPwdWithLongToken, resetPwdWithShortToken } = require('./reset-password');
const { verifySignupWithLongToken, verifySignupWithShortToken } = require('./verify-signup');

module.exports = [
  {
    name: 'checkUnique',
    desc: 'checkUnique - default plugin, authentication-local-management',
    version: '1.0.0',
    run: async (accumulator, data, options, pluginsContext, pluginContext) => {
      return await checkUnique(
        options, data.value, data.ownId || null, data.meta || {},
        data.authUser, data.provider
      );
    },
  },
  {
    name: 'resendVerifySignup',
    desc: 'resendVerifySignup - default plugin, authentication-local-management',
    version: '1.0.0',
    run: async (accumulator, data, options, pluginsContext, pluginContext) => {
      return await resendVerifySignup(
        options, data.value, data.notifierOptions, data.authUser, data.provider
      );
    },
  },
  {
    name: 'verifySignupLong',
    desc: 'verifySignupLong - default plugin, authentication-local-management',
    version: '1.0.0',
    run: async (accumulator, data, options, pluginsContext, pluginContext) => {
      return await verifySignupWithLongToken(
        options, data.value, data.notifierOptions, data.authUser, data.provider
      );
    },
  },
  {
    name: 'verifySignupShort',
    desc: 'verifySignupShort - default plugin, authentication-local-management',
    version: '1.0.0',
    run: async (accumulator, data, options, pluginsContext, pluginContext) => {
      return await verifySignupWithShortToken(
        options, data.value.token, data.value.user, data.notifierOptions, data.authUser, data.provider
      );
    },
  },
  {
    name: 'sendResetPwd',
    desc: 'sendResetPwd - default plugin, authentication-local-management',
    version: '1.0.0',
    run: async (accumulator, data, options, pluginsContext, pluginContext) => {
      return await sendResetPwd(
        options, data.value, data.notifierOptions, data.authUser, data.provider
      );
    },
  },
  {
    name: 'resetPwdLong',
    desc: 'resetPwdLong - default plugin, authentication-local-management',
    version: '1.0.0',
    run: async (accumulator, data, options, pluginsContext, pluginContext) => {
      return await resetPwdWithLongToken(
        options, data.value.token, data.value.password, data.notifierOptions, data.authUser, data.provider
      );
    },
  },
  {
    name: 'resetPwdShort',
    desc: 'resetPwdShort - default plugin, authentication-local-management',
    version: '1.0.0',
    run: async (accumulator, data, options, pluginsContext, pluginContext) => {
      return await resetPwdWithShortToken(
        options, data.value.token, data.value.user, data.value.password, data.notifierOptions, data.authUser, data.provider
      );
    },
  },
  {
    name: 'passwordChange',
    desc: 'passwordChange - default plugin, authentication-local-management',
    version: '1.0.0',
    run: async (accumulator, data, options, pluginsContext, pluginContext) => {
      return await passwordChange(
        options, data.value.user, data.value.oldPassword, data.value.password, data.notifierOptions,
        data.authUser, data.provider
      );
    },
  },
  {
    name: 'identityChange',
    desc: 'identityChange - default plugin, authentication-local-management',
    version: '1.0.0',
    run: async (accumulator, data, options, pluginsContext, pluginContext) => {
      return await identityChange(
        options, data.value.user, data.value.password, data.value.changes, data.notifierOptions,
        data.authUser, data.provider
      );
    },
  },
];

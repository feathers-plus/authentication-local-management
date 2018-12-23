
const makeDebug = require('debug');
const checkUnique = require('./check-unique');
const identityChange = require('./identity-change');
const passwordChange = require('./password-change');
const resendVerifySignup = require('./resend-verify-signup');
const sendResetPwd = require('./send-reset-pwd');
const { resetPwdWithLongToken, resetPwdWithShortToken } = require('./reset-password');
const { verifySignupWithLongToken, verifySignupWithShortToken } = require('./verify-signup');

const debug = makeDebug('authLocalMgnt:plugins');

module.exports = [
  // main service handlers
  {
    name: 'checkUnique',
    desc: 'checkUnique - default plugin, authentication-local-management',
    version: '1.0.0',
    trigger: 'checkUnique',
    run: async (accumulator, data, pluginsContext, pluginContext) => {
      return await checkUnique(pluginsContext,
        data.value, data.ownId || null, data.meta || {},
        data.authUser, data.provider
      );
    },
  },
  {
    name: 'identityChange',
    desc: 'identityChange - default plugin, authentication-local-management',
    version: '1.0.0',
    trigger: 'identityChange',
    run: async (accumulator, data, pluginsContext, pluginContext) => {
      return await identityChange(pluginsContext,
        data.value.user, data.value.password, data.value.changes, data.notifierOptions,
        data.authUser, data.provider
      );
    },
  },
  {
    name: 'passwordChange',
    desc: 'passwordChange - default plugin, authentication-local-management',
    version: '1.0.0',
    trigger: 'passwordChange',
    run: async (accumulator, data, pluginsContext, pluginContext) => {
      return await passwordChange(pluginsContext,
        data.value.user, data.value.oldPassword, data.value.password, data.notifierOptions,
        data.authUser, data.provider
      );
    },
  },
  {
    name: 'resendVerifySignup',
    desc: 'resendVerifySignup - default plugin, authentication-local-management',
    version: '1.0.0',
    trigger: 'resendVerifySignup',
    run: async (accumulator, data, pluginsContext, pluginContext) => {
      return await resendVerifySignup(pluginsContext,
        data.value, data.notifierOptions,
        data.authUser, data.provider
      );
    },
  },
  {
    name: 'resetPwdLong',
    desc: 'resetPwdLong - default plugin, authentication-local-management',
    version: '1.0.0',
    trigger: 'resetPwdLong',
    run: async (accumulator, data, pluginsContext, pluginContext) => {
      return await resetPwdWithLongToken(pluginsContext,
        data.value.token, data.value.password, data.notifierOptions,
        data.authUser, data.provider
      );
    },
  },
  {
    name: 'resetPwdShort',
    desc: 'resetPwdShort - default plugin, authentication-local-management',
    version: '1.0.0',
    trigger: 'resetPwdShort',
    run: async (accumulator, data, pluginsContext, pluginContext) => {
      return await resetPwdWithShortToken(pluginsContext,
        data.value.token, data.value.user, data.value.password, data.notifierOptions,
        data.authUser, data.provider
      );
    },
  },
  {
    name: 'sendResetPwd',
    desc: 'sendResetPwd - default plugin, authentication-local-management',
    version: '1.0.0',
    trigger: 'sendResetPwd',
    run: async (accumulator, data, pluginsContext, pluginContext) => {
      return await sendResetPwd(pluginsContext,
        data.value, data.notifierOptions,
        data.authUser, data.provider
      );
    },
  },
  {
    name: 'verifySignupLong',
    desc: 'verifySignupLong - default plugin, authentication-local-management',
    version: '1.0.0',
    trigger: 'verifySignupLong',
    run: async (accumulator, data, pluginsContext, pluginContext) => {
      return await verifySignupWithLongToken(pluginsContext,
        data.value, data.notifierOptions,
        data.authUser, data.provider
      );
    },
  },
  {
    name: 'verifySignupShort',
    desc: 'verifySignupShort - default plugin, authentication-local-management',
    version: '1.0.0',
    trigger: 'verifySignupShort',
    run: async (accumulator, data, pluginsContext, pluginContext) => {
      return await verifySignupWithShortToken(pluginsContext,
        data.value.token, data.value.user, data.notifierOptions,
        data.authUser, data.provider
      );
    },
  },

  // checkUnique service calls
  pluginFactory('checkUnique.find', 'find'),

  // identityChange service calls
  pluginFactory('identityChange.find', 'find'),
  pluginFactory('identityChange.patch', 'patch'),

  // passwordChange service calls
  pluginFactory('passwordChange.find', 'find'),
  pluginFactory('passwordChange.patch', 'patch'),

  // resendVerifySignup service calls
  pluginFactory('resendVerifySignup.find', 'find'),
  pluginFactory('resendVerifySignup.patch', 'patch'),

  // resetPassword service calls
  pluginFactory('resetPassword.tokenGet', 'get'),
  pluginFactory('resetPassword.shortTokenFind', 'find'),
  pluginFactory('resetPassword.badTokenPatch', 'patch'),
  pluginFactory('resetPassword.patch', 'patch'),

  // sendResetPwd service calls
  pluginFactory('sendResetPwd.find', 'find'),
  pluginFactory('sendResetPwd.patch', 'patch'),

  // verifySignup service calls
  pluginFactory('verifySignup.find', 'find'),
  pluginFactory('verifySignup.find', 'patch'),

  // notifier
  {
    trigger: 'notifier',
    run: async (accumulator, { type, sanitizedUser, notifierOptions }, { options }, pluginContext) => {
      debug('notifier', type);
      // console.log('a-l-m default notifier called', type, sanitizedUser, notifierOptions);
      return sanitizedUser;
    },
  },

  // utilities
  {
    trigger: 'sanitizeUserForNotifier',
    run: async (accumulator, user, { options } , pluginContext) => {
      const sanitizedUser = shallowCloneObject(user);

      delete sanitizedUser[options.passwordField];

      return sanitizedUser;
    },
  },
  {
    trigger: 'sanitizeUserForClient',
    run: async (accumulator, user, { options } , pluginContext) => {
      const sanitizedUser = shallowCloneObject(user);

      delete sanitizedUser[options.passwordField];
      delete sanitizedUser.verifyExpires;
      delete sanitizedUser.verifyToken;
      delete sanitizedUser.verifyShortToken;
      delete sanitizedUser.verifyChanges;
      delete sanitizedUser.resetExpires;
      delete sanitizedUser.resetToken;
      delete sanitizedUser.resetShortToken;

      return sanitizedUser;
    },
  },

  // catch error during processing
  {
    trigger: 'catchError',
    run: async (accumulator, err, pluginsContext, pluginContext) =>
      Promise.reject(err) // support both async and Promise interfaces
  },

  // buildEmailLink
  {
    trigger: 'buildEmailLink',
    run: async (accumulator, actionToVerb, pluginsContext, pluginContext) => {
      const app = pluginsContext.options.app;
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
    },
  },
];

function shallowCloneObject(obj) {
  return Object.assign({}, obj);
}

function pluginFactory(trigger, type) {
  let run;

  switch (type) {
    case 'find':
      run = async (accumulator, { usersService, params}, pluginsContext, pluginContext) =>
        await usersService.find(params);
      break;
    case 'get':
      run = async (accumulator, { usersService, id, params}, pluginsContext, pluginContext) =>
        await usersService.get(id, params);
      break;
    case 'patch':
      run = async (accumulator, { usersService, id, data, params }, pluginsContext, pluginContext) =>
        await usersService.patch(id, data, params);
      break;
    case 'no-op':
      run = async (accumulator, data, pluginsContext, pluginContext) =>
        accumulator || data;
      break;
    default:
      throw new Error(`Invalid type ${type}. (plugins-default`);
  }

  return {
    name: trigger,
    desc: `${trigger} - default plugin, authentication-local-management`,
    version: '1.0.0',
    trigger: trigger,
    run,
  };
}

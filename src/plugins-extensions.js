
const makeDebug = require('debug');
const deleteExpiredUsers = require('./delete-expired-users');
const sendMfa = require('./send-mfa');
const verifyMfa = require('./verify-mfa');

const debug = makeDebug('authLocalMgnt:plugins-extensions');

module.exports = [
  // main service handlers
  {
    name: 'deleteExpiredUsers',
    desc: 'deleteExpiredUsers - default plugin, authentication-local-management',
    version: '1.0.0',
    trigger: 'deleteExpiredUsers',
    run: async (accumulator, data, pluginsContext, pluginContext) => {
      return await deleteExpiredUsers(pluginsContext,
        data,
        data.authUser, data.provider
      );
    },
  },
  {
    name: 'sendMfa',
    desc: 'sendMfa - default plugin, authentication-local-management',
    version: '1.0.0',
    trigger: 'sendMfa',
    run: async (accumulator, data, pluginsContext, pluginContext) => {
      return await sendMfa(pluginsContext,
        data.value.user, data.value.type, data.notifierOptions,
        data.authUser, data.provider
      );
    },
  },
  {
    name: 'verifyMfa',
    desc: 'verifyMfa - default plugin, authentication-local-management',
    version: '1.0.0',
    trigger: 'verifyMfa',
    run: async (accumulator, data, pluginsContext, pluginContext) => {
      return await verifyMfa(pluginsContext,
        data.value.user, data.value.token, data.value.type,
        data.authUser, data.provider
      );
    },
  },
  /*
  // users record
  { password: 'x', pin: 'x', 'badge' }
  // options
  identify[Additional]PasswordProps: ['password', 'pin', 'badge']
  // hooks
  conversionSql hook
  // code with password as param
  identityChange - need password value as param
  sanitizeUserForNotifier
  sanitizeUserForClient
  verify-signup - need in initial password for an invited user)
  */
  {
    name: 'passwordsChange',
    desc: 'passwordsChange - default plugin, authentication-local-management',
    version: '1.0.0',
    trigger: 'passwordsChange',
    run: async (accumulator, data, pluginsContext, pluginContext) => {
      return await passwordChange(pluginsContext,
        data.value.user, data.value.oldPassword, data.value.password, data.notifierOptions,
        data.authUser, data.provider
      );
    },
  },

  // deleteExpiredUsers service calls
  {
    name: 'deleteExpiredUsers.filter',
    desc: 'deleteExpiredUsers.filter - default plugin, authentication-local-management',
    version: '1.0.0',
    trigger: 'deleteExpiredUsers.filter',
    run: async (accumulator, { callData, id, user }, pluginsContext, pluginContext) => {
      const isInvitationExpires = callData.isInvitationExpires || Date.now();
      const isVerifiedExpires = callData.isVerifiedExpires || Date.now();

      // todo should this be user.inviteExpires ?????????????????????????????????????????????????????????
      return (user.isInvitation && isInvitationExpires && user.verifyExpires <= isInvitationExpires) ||
        (!user.isVerified && isVerifiedExpires && user.verifyExpires <= isVerifiedExpires);
    },
  },
  pluginFactory('deleteExpiredUsers.remove', 'remove'),

  // sendMfa service calls
  pluginFactory('sendMfa.find', 'find'),
  pluginFactory('sendMfa.patch', 'patch'),

  // verifyMfa service calls
  pluginFactory('verifyMfa.find', 'find'),
  pluginFactory('verifyMfa.patch', 'patch'),

  // passwordsChange service calls
  pluginFactory('passwordsChange.find', 'find'),
  pluginFactory('passwordsChange.patch', 'patch'),
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
    case 'remove':
      run = async (accumulator, { usersService, id, params }, pluginsContext, pluginContext) =>
        await usersService.remove(id, params);
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

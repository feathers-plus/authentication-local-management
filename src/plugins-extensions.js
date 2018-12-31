
const makeDebug = require('debug');
const deleteExpiredUsers = require('./delete-expired-users');

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

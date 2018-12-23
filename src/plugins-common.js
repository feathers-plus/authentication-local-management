
module.exports = {
  noop: async (accumulator, data, pluginsContext, pluginContext) =>
    accumulator || data,

  find: async (accumulator, { usersService, params}, pluginsContext, pluginContext) =>
    await usersService.find(params),

  get: async (accumulator, { usersService, id, params}, pluginsContext, pluginContext) =>
    await usersService.get(id, params),

  patch: async (accumulator, { usersService, id, data, params }, pluginsContext, pluginContext) =>
    await usersService.patch(id, data, params),

};

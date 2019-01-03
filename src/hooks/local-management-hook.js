
const { authenticate } = require('@feathersjs/authentication').hooks;

module.exports = localManagementHook;

function localManagementHook (commandsNoAuth = []) {
  commandsNoAuth = commandsNoAuth || [
    'resendVerifySignup', 'verifySignupLong', 'verifySignupShort',
    'sendResetPwd', 'resetPwdLong', 'resetPwdShort'
  ];

  return async context => {
    if (!context.data || !commandsNoAuth.includes(context.data.action)) {
      context = await authenticate('jwt')(context);
    }

    context.data.authUser = context.params.user;
    context.data.provider = context.params.provider;

    return context;
  };
}

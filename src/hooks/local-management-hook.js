
const { authenticate } = require('@feathersjs/authentication').hooks;

module.exports = localManagementHook;

function localManagementHook (actionsNoAuth) {
  actionsNoAuth = actionsNoAuth || [
    'resendVerifySignup', 'verifySignupLong', 'verifySignupShort',
    'sendResetPwd', 'resetPwdLong', 'resetPwdShort'
  ];

  return async context => {
    if (!context.data || !actionsNoAuth.includes(context.data.action)) {
      context = await authenticate('jwt')(context);
    }

    context.data.authUser = context.params.user;
    context.data.provider = context.params.provider;

    return context;
  };
}

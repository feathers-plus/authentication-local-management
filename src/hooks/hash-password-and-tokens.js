
const { hashPassword } = require('@feathersjs/authentication-local').hooks;

module.exports = hashPasswordAndTokens;

function hashPasswordAndTokens (password, verifyToken, resetToken, resetShortToken) {
  return async (context) => {
    const context1 = await hashPassword({ passwordField: password })(context);
    const context2 = await hashPassword({ passwordField: verifyToken || 'verifyToken' })(context1);
    const context3 = await hashPassword({ passwordField: resetToken || 'resetToken' })(context2);
    return hashPassword({ passwordField: resetShortToken || 'resetShortToken' })(context3);
  };
}

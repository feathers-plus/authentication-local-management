
const { checkContext, getItems, replaceItems } = require('feathers-hooks-common');

module.exports = removeVerification;

function removeVerification (ifReturnTokens) {
  return context => {
    checkContext(context, 'after');

    // Retrieve the items from the context
    let users = getItems(context);
    if (!users) return;
    const isArray = Array.isArray(users);
    users = (isArray ? users : [users]);

    users.forEach(user => {
      if (!('isVerified' in user) && context.method === 'create') {
        /* eslint-disable no-console */
        console.warn('Property isVerified not found in user properties.');
        console.warn('Have you added localManagement\'s properties to your model? (Refer to README.md)');
        console.warn('Have you added the addVerification hook on users::create? (removeVerification)');
        /* eslint-enable */
      }

      if (context.params.provider && user) { // noop if initiated by server
        delete user.verifyExpires;
        delete user.verifyChanges;
        delete user.resetExpires;
        delete user.mfaExpires;
        if (!ifReturnTokens) {
          delete user.verifyToken;
          delete user.verifyShortToken;
          delete user.resetToken;
          delete user.resetShortToken;
          delete user.mfaShortToken;
          delete user.mfaType;
        }
      }
    });
    // Replace the items within the hook
    replaceItems(context, isArray ? users : users[0]);
  };
}


const errors = require('@feathersjs/errors');
const { checkContext } = require('feathers-hooks-common');

module.exports = protectUserAlmFields;

function protectUserAlmFields (preventWhen, verificationFields) {
  preventWhen = preventWhen || (context => !!context.params.provider); // no-op on server calls

  verificationFields = verificationFields || [
    'isInvitation', 'isVerified', 'preferredComm',
    'verifyExpires', 'verifyToken', 'verifyShortToken', 'verifyChanges',
    'resetExpires', 'resetToken', 'resetShortToken',
    'mfaExpires', 'mfaShortToken', 'mfaType',
  ];

  return context => {
    checkContext(context, 'before', ['patch'], 'protectUserAlmFields');

    // Clients cannot directly modify identity fields like email & phone
    // nor verification fields.
    if (preventWhen(context)) {
      const data = context.data;
      const options = context.app.get('localManagement');
      const fields = [].concat(
        options.userIdentityFields, options.userExtraPasswordFields, options.userProtectedFields,
        verificationFields,
      );

      fields.forEach(name => {
        if (name in data && data[name] !== undefined) {
          throw new errors.BadRequest(
            `Field ${name} may not be patched. (protectUserAlmFields)`
          );
        }
      });
    }

    return context;
  };
}

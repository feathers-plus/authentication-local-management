
const errors = require('@feathersjs/errors');
const { checkContext } = require('feathers-hooks-common');

module.exports = preventChangesVerification;

function preventChangesVerification(preventWhen, identifyUserProps, verificationFields) {
  preventWhen = preventWhen || (context => !!context.params.provider);

  verificationFields = verificationFields || [
    'isVerified', 'verifyExpires', 'verifyToken', 'verifyShortToken', 'verifyChange',
    'resetExpires', 'resetToken', 'resetShortToken',
  ];

  return context => {
    checkContext(context, 'before', ['patch'], 'preventChangesVerification');

    // Clients cannot directly modify identity fields like email & phone
    // nor verification fields.
    if (preventWhen(context)) {
      const data = context.data;
      const options = context.app.get('localManagement');
      const fields = [].concat(
        identifyUserProps || (options || {}).identifyUserProps,
        verificationFields
      );

      fields.forEach(name => {
        if (name in data && data[name] !== undefined) {
          throw new errors.BadRequest(
            `Field ${name} may not be patched. (preventChangesVerification)`
          );
        }
      });
    }

    return context;
  };
}

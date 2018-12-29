
const errors = require('@feathersjs/errors');
const { checkContext } = require('feathers-hooks-common');

module.exports = preventChangesVerification;

function preventChangesVerification (preventWhen, identifyUserProps, verificationFields) {
  preventWhen = preventWhen || (context => !!context.params.provider); // no-op on server calls

  verificationFields = verificationFields || [
    'isVerified', 'verifyExpires', 'verifyToken', 'verifyShortToken', 'verifyChanges',
    'resetExpires', 'resetToken', 'resetShortToken', 'preferredComm'
  ];

  return context => {
    checkContext(context, 'before', ['patch'], 'preventChangesVerification');

    // Clients cannot directly modify identity fields like email & phone
    // nor verification fields.
    if (preventWhen(context)) {
      const data = context.data;
      const options = context.app.get('localManagement');
      const identifyProps = identifyUserProps ||
        (options || {}).identifyUserProps || ['email', 'dialablePhone'];

      const fields = [].concat(identifyProps, verificationFields);

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

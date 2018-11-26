
const errors = require('@feathersjs/errors');
const { checkContext } = require('feathers-hooks-common');

module.exports = isVerified;

function isVerified () {
  return context => {
    checkContext(context, 'before');

    if (context.params.provider && (!context.params.user || !context.params.user.isVerified)) {
      throw new errors.BadRequest('User\'s email is not yet verified.');
    }
  };
}


const { checkContext, getItems, replaceItems } = require('feathers-hooks-common');
const { getLongToken, getShortToken } = require('@feathers-plus/commons');
const { ensureFieldHasChanged } = require('../helpers');

module.exports = addVerification;

function addVerification () {
  return async context => {
    checkContext(context, 'before', ['create', 'patch', 'update']);

    const items = getItems(context);
    const recs = Array.isArray(items) ? items : [items];
    const options = context.app.get('localManagement');

    for (let i = 0, ilen = recs.length; i < ilen; i++) {
      const rec = recs[i];

      // We do NOT add verification fields if the 3 following conditions are fulfilled:
      // - context is PATCH or PUT
      // - user is authenticated
      // - user's userIdentityFields fields did not change
      if (
        !(context.method === 'patch' || context.method === 'update') ||
        !context.params.user ||
        options.userIdentityFields.some(ensureFieldHasChanged(rec, context.params.user))
      ) {
        // An invited user, upon creation, must have set rec.isInvitation === true.
        // Full users, upon creation, need not have rec.isInvitation set.
        rec.isInvitation = 'isInvitation' in rec ? !!rec.isInvitation : false;
        rec.isVerified = false;
        rec.verifyExpires = Date.now() + options.verifyDelay;
        rec.verifyToken = await getLongToken(options.longTokenLen);
        rec.verifyShortToken = await getShortToken(options.shortTokenLen, options.shortTokenDigits);
        rec.verifyChanges = {};
      }
    }

    replaceItems(context, items);
    return context;
  };
}

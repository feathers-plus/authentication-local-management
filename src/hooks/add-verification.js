
const { checkContext, getItems, replaceItems } = require('feathers-hooks-common');
const { getLongToken, getShortToken, ensureFieldHasChanged } = require('../helpers');

module.exports = addVerification;

function addVerification (path) {
  return async context => {
    checkContext(context, 'before', ['create', 'patch', 'update']);
    const items = getItems(context);
    const recs = Array.isArray(items) ? items : [items];

    const options = await context.app.service(path || 'authManagement').create({ action: 'options' });

    for (let i = 0, ilen = recs.length; i < ilen; i++) {
      const rec = recs[i];

      // We do NOT add verification fields if the 3 following conditions are fulfilled:
      // - context is PATCH or PUT
      // - user is authenticated
      // - user's identifyUserProps fields did not change
      if (
        !(context.method === 'patch' || context.method === 'update') ||
        !context.params.user ||
        options.identifyUserProps.some(ensureFieldHasChanged(rec, context.params.user))
      ) {
        rec.isVerified = false;
        rec.verifyExpires = Date.now() + options.delay;
        rec.verifyToken = await getLongToken(options.longTokenLen);
        rec.verifyShortToken = await getShortToken(options.shortTokenLen, options.shortTokenDigits);
        rec.verifyChanges = {};
      }
    }

    replaceItems(context, items);
    return context;
  };
}

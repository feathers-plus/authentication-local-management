
const makeDebug = require('debug');
const ensureObjPropsValid = require('./helpers/ensure-obj-props-valid');
const getUserData = require('./helpers/get-user-data');
const { getShortToken } = require('@feathers-plus/commons');

const debug = makeDebug('authLocalMgnt:sendResetPwd');


module.exports = verifyMfa;

async function verifyMfa (
  { options, plugins }, identifyUser, token, type, authUser, provider
) {
  debug('verifyMfa');
  const usersService = options.app.service(options.service);
  const usersServiceIdName = usersService.id;
  debug('id', usersService.id);

  ensureObjPropsValid(identifyUser, options.identifyUserProps);

  const users = await plugins.run('verifyMfa.find', {
    usersService,
    params: { query: identifyUser },
  });

  const user1 = getUserData(users,  options.skipIsVerifiedCheck ? [] : ['isVerified']);

  const ifValid = user1.mfaShortToken === token && user1.mfaType === type &&
    typeof user1.mfaExpires === 'number' && user1.mfaExpires >= Date.now();

  const user2 = await plugins.run('verifyMfa.patch', {
    usersService,
    id: user1[usersServiceIdName],
    data: {
      mfaExpires: null,
      mfaShortToken: null,
      mfaType: null,
    },
  });

  if (!ifValid) {
    throw new errors.BadRequest('Multi factor token bad.',
      { errors: { $className: 'mfaBad' } });
  }

  return await plugins.run('sanitizeUserForClient', user2);
}

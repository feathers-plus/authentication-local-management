
const makeDebug = require('debug');
const debug = makeDebug('authLocalMgnt:deleteExpiredUsers');

module.exports = deleteExpiredUsers;

async function deleteExpiredUsers (
  { options, plugins }, data, notifierOptions, authUser, provider
) {
  debug('deleteExpiredUsers');
  if (provider || authUser) return; // Only call by server is allowed.

  const usersService = options.app.service(options.service);
  const usersServiceIdName = usersService.id;
  debug('id', usersService.id);

  const result = await usersService.find({ query: { isVerified: false }, paginate: false });
  const users = result.data || result;

  for (let i = 0, leni = users.length; i < leni; i++) {
    const user = users[i];

    const isExpired = await plugins.run('deleteExpiredUsers.filter', {
      callData: data,
      id: user[usersServiceIdName],
      user,
    });

    if (isExpired) {
      await plugins.run('deleteExpiredUsers.remove', {
        usersService,
        id: user[usersServiceIdName],
      });
    }
  }
}

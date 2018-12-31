
const assert = require('chai').assert;
const feathers = require('@feathersjs/feathers');
const feathersMemory = require('feathers-memory');
const authLocalMgnt = require('../src/index');
const { timeoutEachTest, maxTimeAllTests } = require('./helpers/config');

const now = Date.now();

const makeUsersService = (options) => function (app) {
  app.use('/users', feathersMemory(options));
};

const usersId = [
  { id: 'a', email: 'a', isInvitation: false, isVerified: false, verifyExpires: now - 100 },
  { id: 'b', email: 'b', isInvitation: false, isVerified: false, verifyExpires: now },
  { id: 'c', email: 'b', isInvitation: false, isVerified: false, verifyExpires: now + maxTimeAllTests },
  { id: 'd', email: 'c', isInvitation: false, isVerified: true,  verifyExpires: null },
  { id: 'e', email: 'd', isInvitation: true,  isVerified: false, verifyExpires: now - 100 },
  { id: 'f', email: 'e', isInvitation: true,  isVerified: false, verifyExpires: now },
  { id: 'g', email: 'e', isInvitation: true,  isVerified: false, verifyExpires: now + maxTimeAllTests },
  { id: 'h', email: 'f', isInvitation: true,  isVerified: true,  verifyExpires: null },
];

const users_Id = [
  { _id: 'a', email: 'a', isInvitation: false, isVerified: false, verifyExpires: now - 100 },
  { _id: 'b', email: 'b', isInvitation: false, isVerified: false, verifyExpires: now },
  { _id: 'c', email: 'b', isInvitation: false, isVerified: false, verifyExpires: now + maxTimeAllTests },
  { _id: 'd', email: 'c', isInvitation: false, isVerified: true,  verifyExpires: null },
  { _id: 'e', email: 'd', isInvitation: true,  isVerified: false, verifyExpires: now - 100 },
  { _id: 'f', email: 'e', isInvitation: true,  isVerified: false, verifyExpires: now },
  { _id: 'g', email: 'e', isInvitation: true,  isVerified: false, verifyExpires: now + maxTimeAllTests },
  { _id: 'h', email: 'f', isInvitation: true,  isVerified: true,  verifyExpires: null },
];

['_id', 'id'].forEach(idType => {
  ['paginated', 'non-paginated'].forEach(pagination => {
    describe(`delete-expired-users.test.js ${pagination} ${idType}`, function () {
      this.timeout(timeoutEachTest);

      describe('basic', () => {
        let app;
        let usersService;
        let authLocalMgntService;
        let db;

        beforeEach(async () => {
          app = feathers();
          app.configure(makeUsersService({ id: idType, paginate: pagination === 'paginated' }));
          app.configure(authLocalMgnt({

          }));
          app.setup();
          authLocalMgntService = app.service('authManagement');

          usersService = app.service('users');
          await usersService.remove(null);
          db = clone(idType === '_id' ? users_Id : usersId);
          await usersService.create(db);
        });
  
        it('removes users with default datetime', async () => {
          try {
            await authLocalMgntService.create({
              action: 'deleteExpiredUsers',
            });

            const result = await usersService.find({ paginate: false });
            const users = result.data || result;
            const keys = users.map(users => users.id || users._id).sort();

            assert.deepEqual(keys, ['c', 'd', 'g', 'h']);
          } catch (err) {
            console.log(err);
            assert(false, 'err code set' + err.message);
          }
        });

        it('removes users with explicit datetime', async () => {
          try {
            await authLocalMgntService.create({
              action: 'deleteExpiredUsers',
              isInvitationExpires: now - 50,
              isVerifiedExpires: now - 50,
            });

            const result = await usersService.find({ paginate: false });
            const users = result.data || result;
            const keys = users.map(users => users.id || users._id).sort();

            assert.deepEqual(keys, ['b', 'c', 'd', 'f', 'g', 'h']);
          } catch (err) {
            console.log(err);
            assert(false, 'err code set' + err.message);
          }
        });
      });
    });
  });
});

// Helpers

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

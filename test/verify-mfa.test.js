
const assert = require('chai').assert;
const feathers = require('@feathersjs/feathers');
const feathersMemory = require('feathers-memory');
const authLocalMgnt = require('../src/index');
const { hashPassword } = require('@feathersjs/authentication-local').hooks;
const { timeoutEachTest, maxTimeAllTests } = require('./helpers/config');

const now = Date.now();
const timeout = timeoutEachTest;
let stack;

const makeUsersService = (options) => function (app) {
  app.use('/users', feathersMemory(options));

  app.service('users').hooks({
    before: {
      create: hashPassword(),
      patch: hashPassword(),
    }
  });
};

const usersId = [
  { id: 'a', email: 'a', isVerified: false, verifyToken: '000', verifyExpires: now + maxTimeAllTests },
  { id: 'b', email: 'b', isVerified: true, verifyToken: null, verifyExpires: null },
];

const users_Id = [
  { _id: 'a', email: 'a', isVerified: false, verifyToken: '000', verifyExpires: now + maxTimeAllTests },
  { _id: 'b', email: 'b', isVerified: true, verifyToken: null, verifyExpires: null },
];

['_id', 'id'].forEach(idType => {
  ['paginated', 'non-paginated'].forEach(pagination => {
    describe(`verify-mfa.test.js ${pagination} ${idType}`, function () {
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
          authLocalMgntService = app.service('localManagement');

          usersService = app.service('users');
          await usersService.remove(null);
          db = clone(idType === '_id' ? users_Id : usersId);
          await usersService.create(db);
        });

        it('verifies token', async function () {
          const result = await authLocalMgntService.create({
            action: 'sendMfa',
            value: {
              user: { email: 'b' },
              type: 'xyz',
            },
          });

          const user = await usersService.get(result.id || result._id);

          await authLocalMgntService.create({
            action: 'verifyMfa',
            value: {
              user: { email: 'b' },
              type: 'xyz',
              token: user.mfaShortToken,
            },
          });

          const user1 = await usersService.get(result.id || result._id);

          assert.strictEqual(user1.mfaExpires, null);
          assert.strictEqual(user1.mfaShortToken, null);
          assert.strictEqual(user1.mfaType, null);
        });

        it('error on bad token', async function () {
          try {
            const result = await authLocalMgntService.create({
              action: 'sendMfa',
              value: {
                user: { email: 'a' },
                type: 'xyz',
              },
            });

            await authLocalMgntService.create({
              action: 'verifyMfa',
              value: {
                user: { email: 'b' },
                type: 'xyz',
                token: '3456789',
              },
            });

            assert(false, 'unexpected succeeded.');
          } catch (err) {
            assert.isString(err.message);
            assert.isNotFalse(err.message);
          }
        });

        it('error on bad type', async function () {
          try {
            const result = await authLocalMgntService.create({
              action: 'sendMfa',
              value: {
                user: { email: 'a' },
                type: 'xyz',
              },
            });

            await authLocalMgntService.create({
              action: 'verifyMfa',
              value: {
                user: { email: 'b' },
                type: '$%^&*()',
                token: user.mfaShortToken,
              },
            });

            assert(false, 'unexpected succeeded.');
          } catch (err) {
            assert.isString(err.message);
            assert.isNotFalse(err.message);
          }
        });


        it('error on expired token', async function () {
          try {
            const result = await authLocalMgntService.create({
              action: 'sendMfa',
              value: {
                user: { email: 'a' },
                type: 'xyz',
              },
            });

            const user = await usersService.get(result.id || result._id);
            await usersService.get(result.id || result._id, { mfaExpired: user.mfaExpired - 1000 });

            await authLocalMgntService.create({
              action: 'verifyMfa',
              value: {
                user: { email: 'b' },
                type: 'xyz',
                token: user.mfaShortToken,
              },
            });

            assert(false, 'unexpected succeeded.');
          } catch (err) {
            assert.isString(err.message);
            assert.isNotFalse(err.message);
          }
        });
      });
    });
  });
});


// Helpers

function makeDateTime(options1) {
  options1 = options1 || {};
  return Date.now() + (options1.verifyDelay || maxTimeAllTests);
}

function aboutEqualDateTime(time1, time2, msg, delta) {
  delta = delta || maxTimeAllTests;
  const diff = Math.abs(time1 - time2);
  assert.isAtMost(diff, delta, msg || `times differ by ${diff}ms`);
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

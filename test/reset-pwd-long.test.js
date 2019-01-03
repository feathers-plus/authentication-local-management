
const assert = require('chai').assert;
const feathers = require('@feathersjs/feathers');
const feathersMemory = require('feathers-memory');
const authLocalMgnt = require('../src/index');
const { hashPasswordFake: { hashPassword } } = require('@feathers-plus/commons');
const { timeoutEachTest, maxTimeAllTests } = require('./helpers/config');

const now = Date.now();
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

const fieldToHash = 'resetToken';
const users_Id = [
  // The added time interval must be longer than it takes to run ALL the tests
  { _id: 'a', email: 'a', isVerified: true, resetToken: 'a___000', resetExpires: now + maxTimeAllTests },
  { _id: 'b', email: 'b', isVerified: true, resetToken: null, resetExpires: null },
  { _id: 'c', email: 'c', isVerified: true, resetToken: 'c___111', resetExpires: now - maxTimeAllTests },
  { _id: 'd', email: 'd', isVerified: false, resetToken: 'd___222', resetExpires: now - maxTimeAllTests },
];

const usersId = [
  // The added time interval must be longer than it takes to run ALL the tests
  { id: 'a', email: 'a', isVerified: true, resetToken: 'a___000', resetExpires: now + maxTimeAllTests },
  { id: 'b', email: 'b', isVerified: true, resetToken: null, resetExpires: null },
  { id: 'c', email: 'c', isVerified: true, resetToken: 'c___111', resetExpires: now - maxTimeAllTests },
  { id: 'd', email: 'd', isVerified: false, resetToken: 'd___222', resetExpires: now - maxTimeAllTests },
];

// Tests
['_id', 'id'].forEach(idType => {
  ['paginated', 'non-paginated'].forEach(pagination => {
    describe(`reset-pwd-long.test.js ${pagination} ${idType}`, function () {
      this.timeout(timeoutEachTest);

      describe('basic', () => {
        let app;
        let usersService;
        let authLocalMgntService;
        let db;
        let result;

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

        it('verifies valid token', async () => {
          try {
            result = await authLocalMgntService.create({
              action: 'resetPwdLong',
              value: { token: 'a___000', password: '123456' }
            });
            const user = await usersService.get(result.id || result._id);

            assert.strictEqual(result.isVerified, true, 'user.isVerified not true');

            assert.strictEqual(user.isVerified, true, 'isVerified not true');
            assert.strictEqual(user.resetToken, null, 'resetToken not null');
            assert.strictEqual(user.resetShortToken, null, 'resetShortToken not null');
            assert.strictEqual(user.resetExpires, null, 'resetExpires not null');
            assert.isString(user.password, 'password not a string');
            assert.isAbove(user.password.length, 6, 'password wrong length');
          } catch (err) {
            console.log(err);
            assert.strictEqual(err, null, 'err code set');
          }
        });

        it('user is sanitized', async () => {
          try {
            result = await authLocalMgntService.create({
              action: 'resetPwdLong',
              value: { token: 'a___000', password: '123456' }
            });
            const user = await usersService.get(result.id || result._id);

            assert.strictEqual(result.isVerified, true, 'isVerified not true');
            assert.strictEqual(result.resetToken, undefined, 'resetToken not undefined');
            assert.strictEqual(result.resetShortToken, undefined, 'resetShortToken not undefined');
            assert.strictEqual(result.resetExpires, undefined, 'resetExpires not undefined');
            assert.isString(user.password, 'password not a string');
            assert.isAbove(user.password.length, 6, 'password wrong length');
          } catch (err) {
            console.log(err);
            assert.strictEqual(err, null, 'err code set');
          }
        });

        it('error on unverified user', async () => {
          try {
            result = await authLocalMgntService.create({
              action: 'resetPwdLong',
              value: { token: 'd___222', password: '123456' }
            });

            assert(false, 'unexpected succeeded.');
          } catch (err) {
            assert.isString(err.message);
            assert.isNotFalse(err.message);
          }
        });

        it('error on expired token', async () => {
          try {
            result = await authLocalMgntService.create({
              action: 'resetPwdLong',
              value: { token: 'c___111', password: '123456' }
            });

            assert(false, 'unexpected succeeded.');
          } catch (err) {
            assert.isString(err.message);
            assert.isNotFalse(err.message);
          }
        });

        it('error on token not found', async () => {
          try {
            result = await authLocalMgntService.create({
              action: 'resetPwdLong',
              value: { token: 'a___999', password: '123456' }
            });

            assert(false, 'unexpected succeeded.');
          } catch (err) {
            assert.isString(err.message);
            assert.isNotFalse(err.message);
          }
        });
      });

      describe('with notification', () => {
        let app;
        let usersService;
        let authLocalMgntService;
        let db;
        let result;

        beforeEach(async () => {
          stack = [];
          
          app = feathers();
          app.configure(makeUsersService({ id: idType, paginate: pagination === 'paginated' }));
          app.configure(authLocalMgnt({
            testMode: true,
            plugins: [{
              trigger: 'notifier',
              position: 'before',
              run: async (accumulator, { type, sanitizedUser, notifierOptions }, { options }, pluginContext) => {
                stack.push({ args: clone([type, sanitizedUser, notifierOptions]), result: sanitizedUser });
              },
            }],
          }));
          app.setup();
          authLocalMgntService = app.service('localManagement');

          usersService = app.service('users');
          await usersService.remove(null);
          db = clone(idType === '_id' ? users_Id : usersId);
          await usersService.create(db);
        });
  
        it('verifies valid token', async () => {
          try {
            result = await authLocalMgntService.create({
              action: 'resetPwdLong',
              value: { token: 'a___000', password: '123456' }
            });
            const user = await usersService.get(result.id || result._id);

            assert.strictEqual(result.isVerified, true, 'user.isVerified not true');

            assert.strictEqual(user.isVerified, true, 'isVerified not true');
            assert.strictEqual(user.resetToken, null, 'resetToken not null');
            assert.strictEqual(user.resetExpires, null, 'resetExpires not null');
            assert.isString(user.password, 'password not a string');
            assert.isAbove(user.password.length, 6, 'password wrong length');

            assert.deepEqual(
              stack[0].args,
              [
                'resetPwd',
                Object.assign({}, sanitizeUserForEmail(user)),
                null
              ]);
          } catch (err) {
            console.log(err);
            assert.strictEqual(err, null, 'err code set');
          }
        });
      });
    });
  });
});

// Helpers

function sanitizeUserForEmail(user) {
  const user1 = Object.assign({}, user);
  delete user1.password;
  return user1;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

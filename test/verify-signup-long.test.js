
const assert = require('chai').assert;
const feathers = require('@feathersjs/feathers');
const feathersMemory = require('feathers-memory');
const authLocalMgnt = require('../src/index');
const { timeoutEachTest, maxTimeAllTests } = require('./helpers/config');

const now = Date.now();
let stack;

const makeUsersService = (options) => function (app) {
  app.use('/users', feathersMemory(options));
};

const usersId = [
  { id: 'a', email: 'a', isVerified: false, verifyToken: '000', verifyExpires: now + maxTimeAllTests },
  { id: 'b', email: 'b', isVerified: false, verifyToken: null, verifyExpires: null },
  { id: 'c', email: 'c', isVerified: false, verifyToken: '111', verifyExpires: now - maxTimeAllTests },
  { id: 'd', email: 'd', isVerified: true, verifyToken: '222', verifyExpires: now - maxTimeAllTests },
  { id: 'e', email: 'e', isVerified: true, verifyToken: '800', verifyExpires: now + maxTimeAllTests,
    verifyChanges: { cellphone: '800' } },
  { id: 'f', email: 'f', isVerified: false, verifyToken: '999', verifyExpires: now + maxTimeAllTests,
    isInvitation: true },
];

const users_Id = [
  { _id: 'a', email: 'a', isVerified: false, verifyToken: '000', verifyExpires: now + maxTimeAllTests },
  { _id: 'b', email: 'b', isVerified: false, verifyToken: null, verifyExpires: null },
  { _id: 'c', email: 'c', isVerified: false, verifyToken: '111', verifyExpires: now - maxTimeAllTests },
  { _id: 'd', email: 'd', isVerified: true, verifyToken: '222', verifyExpires: now - maxTimeAllTests },
  { _id: 'e', email: 'e', isVerified: true, verifyToken: '800', verifyExpires: now + maxTimeAllTests,
    verifyChanges: { cellphone: '800' } },
  { _id: 'f', email: 'f', isVerified: false, verifyToken: '999', verifyExpires: now + maxTimeAllTests,
    isInvitation: true },
];

['_id', 'id'].forEach(idType => {
  ['paginated', 'non-paginated'].forEach(pagination => {
    describe(`verify-signup-long.test.js ${pagination} ${idType}`, function () {
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
  
        it('verifies valid token if not verified full user', async () => {
          try {
            result = await authLocalMgntService.create({
              action: 'verifySignupLong',
              value: '000',
            });
            const user = await usersService.get(result.id || result._id);

            assert.strictEqual(result.isInvitation, false, 'user.isInvitation not false');
            assert.strictEqual(result.isVerified, true, 'user.isVerified not true');

            assert.strictEqual(user.isVerified, true, 'isVerified not true');
            assert.strictEqual(user.verifyToken, null, 'verifyToken not null');
            assert.strictEqual(user.verifyShortToken, null, 'verifyShortToken not null');
            assert.strictEqual(user.verifyExpires, null, 'verifyExpires not null');
            assert.deepEqual(user.verifyChanges, {}, 'verifyChanges not empty object');
          } catch (err) {
            console.log(err);
            assert(false, 'err code set' + err.message);
          }
        });

        it('verifies valid token if not verified invited user', async () => {
          try {
            result = await authLocalMgntService.create({
              action: 'verifySignupLong',
              value: '999',
              newPassword: 'abcd',
            });
            const user = await usersService.get(result.id || result._id);

            assert.strictEqual(result.isInvitation, false, 'user.isInvitation not false');
            assert.strictEqual(result.isVerified, true, 'user.isVerified not true');

            assert.strictEqual(user.isVerified, true, 'isVerified not true');
            assert.strictEqual(user.verifyToken, null, 'verifyToken not null');
            assert.strictEqual(user.verifyShortToken, null, 'verifyShortToken not null');
            assert.strictEqual(user.verifyExpires, null, 'verifyExpires not null');
            assert.deepEqual(user.verifyChanges, {}, 'verifyChanges not empty object');

            assert.strictEqual(user.password, 'abcd', 'password incorrect');
          } catch (err) {
            console.log(err);
            assert(false, 'err code set' + err.message);
          }
        });

        it('verifies valid token if verifyChanges', async () => {
          try {
            result = await authLocalMgntService.create({
              action: 'verifySignupLong',
              value: '800',
            });
            const user = await usersService.get(result.id || result._id);

            assert.strictEqual(result.isVerified, true, 'user.isVerified not true');

            assert.strictEqual(user.isVerified, true, 'isVerified not true');
            assert.strictEqual(user.verifyToken, null, 'verifyToken not null');
            assert.strictEqual(user.verifyShortToken, null, 'verifyShortToken not null');
            assert.strictEqual(user.verifyExpires, null, 'verifyExpires not null');
            assert.deepEqual(user.verifyChanges, {}, 'verifyChanges not empty object');

            assert.strictEqual(user.cellphone, '800', 'cellphone wrong');
          } catch (err) {
            console.log(err);
            assert(false, 'err code set');
          }
        });

        it('user is sanitized', async () => {
          try {
            result = await authLocalMgntService.create({
              action: 'verifySignupLong',
              value: '000',
            });
            const user = await usersService.get(result.id || result._id);

            assert.strictEqual(result.isVerified, true, 'isVerified not true');
            assert.strictEqual(result.verifyToken, undefined, 'verifyToken not undefined');
            assert.strictEqual(result.verifyShortToken, undefined, 'verifyShortToken not undefined');
            assert.strictEqual(result.verifyExpires, undefined, 'verifyExpires not undefined');
            assert.strictEqual(result.verifyChanges, undefined, 'verifyChanges not undefined');
          } catch (err) {
            console.log(err);
            assert(false, 'err code set');
          }
        });

        it('error on verified user without verifyChange', async () => {
          try {
            result = await authLocalMgntService.create({
                action: 'verifySignupLong',
                value: '222',
              },
              {},
              (err, user) => {}
            );

            assert(fail, 'unexpectedly succeeded');
          } catch (err) {
            assert.isString(err.message);
            assert.isNotFalse(err.message);
          }
        });

        it('error on expired token', async () => {
          try {
            result = await authLocalMgntService.create({
              action: 'verifySignupLong',
              value: '111',
            });

            assert(fail, 'unexpectedly succeeded');
          } catch (err) {
            assert.isString(err.message);
            assert.isNotFalse(err.message);
          }
        });

        it('error on token not found', async () => {
          try {
            result = await authLocalMgntService.create({
              action: 'verifySignupLong',
              value: 'xxx'
            });

            assert(false, 'unexpectedly succeeded');
          } catch (err) {
            assert.isString(err.message);
            assert.equal(err.message, 'User not found.');
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
              action: 'verifySignupLong',
              value: '000',
            });
            const user = await usersService.get(result.id || result._id);

            assert.strictEqual(result.isVerified, true, 'user.isVerified not true');

            assert.strictEqual(user.isVerified, true, 'isVerified not true');
            assert.strictEqual(user.verifyToken, null, 'verifyToken not null');
            assert.strictEqual(user.verifyExpires, null, 'verifyExpires not null');

            assert.deepEqual(stack[0].args, [
              'verifySignup',
              Object.assign({}, sanitizeUserForEmail(user)),
              null
            ]);
          } catch (err) {
            console.log(err);
            assert(false, 'err code set');
          }
        });
      });
    });
  });
});

// Helpers

function notifier(app, options) {
  return async (...args) => {
    const [ type, sanitizedUser, notifierOptions ] = args;

    stack.push({ args: clone(args), result: sanitizedUser });

    return sanitizedUser
  }
}

function sanitizeUserForEmail(user) {
  const user1 = Object.assign({}, user);
  delete user1.password;
  return user1;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

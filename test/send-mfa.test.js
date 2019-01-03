
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
    describe(`send-mfa.test.js ${pagination} ${idType}`, function () {
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

        it('updates verified user', async function () {
          const result = await authLocalMgntService.create({ // This returns without everything being resolved ?????
            action: 'sendMfa',
            value: {
              user: { email: 'b' },
              type: 'xyz',
            },
          });

          const user = await usersService.get(result.id || result._id); // Causing this to fail ??????????????
          assert.strictEqual(result.isVerified, true, 'user.isVerified not true');

          assert.strictEqual(user.isVerified, true, 'isVerified not true');
          assert.equal(user.mfaShortToken.length, 6, 'mfa short token wrong length');
          assert.strictEqual(user.mfaType, 'xyz', 'mfaType is wrong');
          aboutEqualDateTime(user.mfaExpires, makeDateTime());
        });

        it('error on unverified user', async function () {
          try {
            const result = await authLocalMgntService.create({
              action: 'sendMfa',
              value: {
                user: { email: 'a' },
                type: 'xyz',
              },
            });

            assert(false, 'unexpected succeeded.');
          } catch (err) {
            assert.isString(err.message);
            assert.isNotFalse(err.message);
          }
        });

        it('error on email not found', async function () {
          try {
            const result = await authLocalMgntService.create({
              action: 'sendMfa',
              value: {
                user: { email: 'x' },
                type: 'xyz',
              },
            });

            assert(false, 'unexpected succeeded.');
          } catch (err) {
            assert.isString(err.message);
            assert.isNotFalse(err.message);
          }
        });

        it('user is sanitized', async function () {
          try {
            const result = await authLocalMgntService.create({
              action: 'sendMfa',
              value: {
                user: { email: 'b' },
                type: 'abc',
              },
            });

            assert.strictEqual(result.isVerified, true, 'isVerified not true');
            assert.strictEqual(result.mfaShortToken, undefined, 'mfaToken not undefined');
            assert.strictEqual(result.mfaType, undefined, 'mfaToken not undefined');
            assert.strictEqual(result.mfaExpires, undefined, 'mfaExpires not undefined');
          } catch (err) {
            console.log(err);
            assert(false, 'err code set');
          }
        });
      });

      describe('length can change (digits)', () => {
        let app;
        let usersService;
        let authLocalMgntService;
        let db;

        beforeEach(async () => {
          app = feathers();
          app.configure(makeUsersService({ id: idType, paginate: pagination === 'paginated' }));
          app.configure(authLocalMgnt({
            longTokenLen: 10,
            shortTokenLen: 9,
            shortTokenDigits: true,
          }));
          app.setup();
          authLocalMgntService = app.service('authManagement');

          usersService = app.service('users');
          await usersService.remove(null);
          db = clone(idType === '_id' ? users_Id : usersId);
          await usersService.create(db);
        });

        it('updates verified user', async function () {
          try {
            const result = await authLocalMgntService.create({
              action: 'sendMfa',
              value: {
                user: { email: 'b' },
                type: 'abc',
              },
            });
            const user = await usersService.get(result.id || result._id);

            assert.strictEqual(result.isVerified, true, 'user.isVerified not true');

            assert.strictEqual(user.isVerified, true, 'isVerified not true');
            assert.equal(user.mfaShortToken.length, 9, 'mfa short token wrong length');
            assert.strictEqual(user.mfaType, 'abc', 'mfsType is wrong');
            aboutEqualDateTime(user.mfaExpires, makeDateTime());
          } catch (err) {
            console.log(err);
            assert(false, 'err code set');
          }
        });
      });

      describe('length can change (alpha)', () => {
        let app;
        let usersService;
        let authLocalMgntService;
        let db;
        let result;

        beforeEach(async () => {
          app = feathers();
          app.configure(makeUsersService({ id: idType, paginate: pagination === 'paginated' }));
          app.configure(authLocalMgnt({
            longTokenLen: 10,
            shortTokenLen: 9,
            shortTokenDigits: false,
          }));
          app.setup();
          authLocalMgntService = app.service('authManagement');

          usersService = app.service('users');
          await usersService.remove(null);
          db = clone(idType === '_id' ? users_Id : usersId);
          await usersService.create(db);
        });

        it('updates verified user', async function () {
          try {
            result = await authLocalMgntService.create({
              action: 'sendMfa',
              value: {
                user: { email: 'b' },
                type: 'abc',
              },
            });
            const user = await usersService.get(result.id || result._id);

            assert.strictEqual(result.isVerified, true, 'user.isVerified not true');

            assert.strictEqual(user.isVerified, true, 'isVerified not true');
            assert.equal(user.mfaShortToken.length, 9, 'mfa short token wrong length');
            assert.strictEqual(user.mfaType, 'abc', 'mfaType wrong');
            aboutEqualDateTime(user.mfaExpires, makeDateTime());
          } catch (err) {
            console.log(err);
            assert(false, 'err code set');
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
            longTokenLen: 15,
            shortTokenLen: 6,
            shortTokenDigits: true,
            plugins: [{
              trigger: 'notifier',
              position: 'clear',
              run: async (accumulator, { type, sanitizedUser, notifierOptions }, { options }, pluginContext) => {
                stack.push({ args: clone([type, sanitizedUser, notifierOptions]), result: sanitizedUser });
              },
            }],
          }));
          app.setup();
          authLocalMgntService = app.service('authManagement');

          usersService = app.service('users');
          await usersService.remove(null);
          db = clone(idType === '_id' ? users_Id : usersId);
          await usersService.create(db);
        });

        it('is called', async function () {
          try {
            result = await authLocalMgntService.create({
              action: 'sendMfa',
              value: {
                user: { email: 'b' },
                type: 'abc',
              },
              notifierOptions: { transport: 'sms' }
            });
            const user = await usersService.get(result.id || result._id);

            assert.strictEqual(result.isVerified, true, 'user.isVerified not true');

            assert.strictEqual(user.isVerified, true, 'isVerified not true');
            assert.equal(user.mfaShortToken.length, 6, 'mfa token wrong length');
            aboutEqualDateTime(user.mfaExpires, makeDateTime());

            const expected = stack[0].args
            expected[1] = Object.assign({}, expected[1], {
              mfaShortToken: user.mfaShortToken,
              mfaType: user.mfaType,
            });

            assert.deepEqual(expected, [
              'sendMfa',
              sanitizeUserForEmail(user),
              { transport: 'sms' }
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

function makeDateTime(options1) {
  options1 = options1 || {};
  return Date.now() + (options1.delay || maxTimeAllTests);
}

function aboutEqualDateTime(time1, time2, msg, delta) {
  delta = delta || maxTimeAllTests;
  const diff = Math.abs(time1 - time2);
  assert.isAtMost(diff, delta, msg || `times differ by ${diff}ms`);
}

function sanitizeUserForEmail(user) {
  const user1 = clone(user);
  delete user1.password;
  return user1;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}


const assert = require('chai').assert;
const bcrypt = require('bcryptjs');
const feathers = require('@feathersjs/feathers');
const feathersMemory = require('feathers-memory');
const authLocalMgnt = require('../src/index');
const { hashPasswordFake: { hashPassword, bcryptCompare,  bcryptCompareSync } } =
  require('@feathers-plus/commons');
const { timeoutEachTest } = require('./helpers/config');

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

// users DB
const users_Id = [
  { _id: 'a', email: 'a', plainPassword: 'aa', password: 'aa', plainNewPassword: 'xx', isVerified: false },
  { _id: 'b', email: 'b', plainPassword: 'bb', password: 'bb', plainNewPassword: 'yy', isVerified: true },
];

const usersId = [
  { id: 'a', email: 'a', plainPassword: 'aa', password: 'aa', plainNewPassword: 'xx', isVerified: false },
  { id: 'b', email: 'b', plainPassword: 'bb', password: 'bb', plainNewPassword: 'yy', isVerified: true },
];

// Tests
describe('password-change.test.js', function () {
  this.timeout(timeoutEachTest);

  ['_id', 'id'].forEach(idType => {
    ['paginated', 'non-paginated'].forEach(pagination => {
      describe(`passwordChange ${pagination} ${idType}`, () => {
        describe('standard', () => {
          let app;
          let usersService;
          let authLocalMgntService;
          let db;
          let result;

          beforeEach(async () => {
            app = feathers();
            app.configure(makeUsersService({ id: idType, paginate: pagination === 'paginated' }));
            app.configure(authLocalMgnt({
              bcryptCompare,
            }));
            app.setup();
            authLocalMgntService = app.service('authManagement');

            usersService = app.service('users');
            await usersService.remove(null);
            db = clone(idType === '_id' ? users_Id : usersId);
            await usersService.create(db);
          });

          it('updates verified user', async () => {
            try {
              const userRec = clone(users_Id[1]);

              result = await authLocalMgntService.create({
                action: 'passwordChange',
                value: {
                  user: {
                    email: userRec.email
                  },
                  oldPassword: userRec.plainPassword,
                  password: userRec.plainNewPassword
                },
              });
              const user = await usersService.get(result.id || result._id);

              assert.strictEqual(result.isVerified, true, 'isVerified not true');
              assert.isOk(bcryptCompareSync(user.plainNewPassword, user.password), `wrong password [1]`);
            } catch (err) {
              console.log(err);
              assert.strictEqual(err, null, 'err code set');
            }
          });

          it('updates unverified user', async () => {
            try {
              const userRec = clone(users_Id[0]);

              result = await authLocalMgntService.create({
                action: 'passwordChange',
                value: {
                  user: {
                    email: userRec.email
                  },
                  oldPassword: userRec.plainPassword,
                  password: userRec.plainNewPassword
                },
              });
              const user = await usersService.get(result.id || result._id);

              assert.strictEqual(result.isVerified, false, 'isVerified not false');
              assert.isOk(bcryptCompareSync(user.plainNewPassword, user.password), `[0]`);
            } catch (err) {
              console.log(err);
              assert.strictEqual(err, null, 'err code set');
            }
          });

          it('error on wrong password', async () => {
            try {
              const userRec = clone(users_Id[0]);

              result = await authLocalMgntService.create({
                action: 'passwordChange',
                value: {
                  user: {
                    email: userRec.email
                  },
                  oldPassword: 'fdfgfghghj',
                  password: userRec.plainNewPassword
                },
              });
              const user = await usersService.get(result.id || result._id);

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
              notifier,
              bcryptCompare,
            }));
            app.setup();
            authLocalMgntService = app.service('authManagement');

            usersService = app.service('users');
            await usersService.remove(null);
            db = clone(idType === '_id' ? users_Id : usersId);
            await usersService.create(db);
          });

          it('updates verified user', async () => {
            try {
              const userRec = clone(users_Id[1]);

              result = await authLocalMgntService.create({
                action: 'passwordChange',
                value: {
                  user: {
                    email: userRec.email
                  },
                  oldPassword: userRec.plainPassword,
                  password: userRec.plainNewPassword
                },
              });
              const user = await usersService.get(result.id || result._id);

              assert.strictEqual(result.isVerified, true, 'isVerified not true');
              assert.isOk(bcryptCompareSync(user.plainNewPassword, user.password), `[1`);
              assert.deepEqual(
                stack[0].args,
                [
                  'passwordChange',
                  sanitizeUserForEmail(user),
                  {}
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
  const user1 = clone(user);
  delete user1.password;
  return user1;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

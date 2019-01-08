
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
  { _id: 'a', email: 'a', plainPassword: 'aa', password: 'aa', plainNewPassword: 'xx', isVerified: false,
    passwordHistory: [
      [ 'foo', 0, '__foo1' ],
      [ 'password', 1546960247540, '__qq' ],
      [ 'foo', 0, '__foo2' ],
      [ 'password', 1546960247540, '__aa' ],
      [ 'foo', 0, '__foo3' ],
    ]
  },
  { _id: 'b', email: 'b', plainPassword: 'bb', password: 'bb', plainNewPassword: 'yy', isVerified: true,
    passwordHistory: []
  },
];

const usersId = [
  { id: 'a', email: 'a', plainPassword: 'aa', password: 'aa', plainNewPassword: 'xx', isVerified: false,
    passwordHistory: [
      [ 'foo', 0, '__foo1' ],
      [ 'password', 1546960247540, '__qq' ],
      [ 'foo', 0, '__foo2' ],
      [ 'password', 1546960247540, '__aa' ],
      [ 'foo', 0, '__foo3' ],
    ]
  },
  { id: 'b', email: 'b', plainPassword: 'bb', password: 'bb', plainNewPassword: 'yy', isVerified: true,
    passwordHistory: []
  },
];

// Tests
describe('password-change-history.test.js', function () {
  this.timeout(timeoutEachTest);

  ['_id'/*, 'id'*/].forEach(idType => {
    ['paginated'/*, 'non-paginated'*/].forEach(pagination => {
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
            authLocalMgntService = app.service('localManagement');

            usersService = app.service('users');
            await usersService.remove(null);
            db = clone(idType === '_id' ? users_Id : usersId);
            await usersService.create(db);
          });

          it('add unique password', async () => {
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

              assert.lengthOf(user.passwordHistory, 1, 'wrong passwordHistory length');

              const [historyField, _, historyPassword] = user.passwordHistory[0];
              assert.strictEqual(historyField, 'password', 'wrong field name');
              assert.isOk(bcryptCompareSync(user.plainNewPassword, historyPassword), `wrong password in history`);
            } catch (err) {
              console.log(err);
              assert.strictEqual(err, null, 'err code set');
            }
          });

          it('add password already used', async () => {
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

              assert(false, 'unexpected succeeded.');
            } catch (err) {
              assert.strictEqual(err.errors.$className, 'repeatedPassword', 'unexpected error');
            }
          });
/*
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
*/
        });
      });
    });
  });
});

// Helpers

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

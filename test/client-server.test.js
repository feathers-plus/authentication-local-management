
const assert = require('chai').assert;
const bcrypt = require('bcryptjs');
const feathers = require('@feathersjs/feathers');
const feathersMemory = require('feathers-memory');
const authLocalMgnt = require('../src/index');
const SpyOn = require('./helpers/basic-spy');
const hashPasswordAndTokens = require('../src/hooks/hash-password-and-tokens');
const { timeoutEachTest } = require('./helpers/config');

const express = require('@feathersjs/express');
const configuration = require('@feathersjs/configuration');
const authentication = require('@feathersjs/authentication');
const jwt = require('@feathersjs/authentication-jwt');
const local = require('@feathersjs/authentication-local');
const socketio = require('@feathersjs/socketio');
const feathersClient = require('@feathersjs/client');
const io = require('socket.io-client');
const { join } = require('path');
const { localStorage, readJsonFileSync } = require('@feathers-plus/test-utils');
const { authenticate } = require('@feathersjs/authentication').hooks;
const { hashPassword, protect } = require('@feathersjs/authentication-local').hooks;
const { addVerification, isVerified } = require('../src/hooks');
const { debug } = require('feathers-hooks-common');

const delayAfterServerOnce = 500;
const delayAfterServerClose = 500;
const timeoutTotal = 60000;
const timeoutSocketio = 10000;

const host = 'localhost';
const port = 3030;
const email = 'login@example.com';
const password = 'login';

const fakeData = [
  { id: 1, email, plainPassword: password, password, plainNewPassword: `00${password}00` },
];

let app;
let server;
let client;

// Tests
describe('client-server.test.js', function () {
  this.timeout(timeoutTotal);

  describe('standard', () => {
    before(async function () {
      this.timeout(timeoutTotal);

      app = await configServer(port);
      console.log('    ... server configured.');

      // Seed database once to save hashing time
      const usersService = app.service('users');
      await usersService.remove(null);
      const db = await usersService.create(clone(fakeData));
      console.log('    ... database seeded with:');
      console.log(db);

      client = await configClient(host, port, email, password, timeoutSocketio);
      console.log('    ... client configured');
    });

    beforeEach(async () => {
      /*
      const usersService = app.service('users');
      await usersService.remove(null);
      const db = await usersService.create(clone(fakeData));
      console.log('    ... database seeded:');
      console.log(db);
      */
    });

    after(function (done) {
      this.timeout(timeoutTotal);

      client.logout();
      server.close();
      setTimeout(() => done(), delayAfterServerClose);
    });

    it('updates verified user', async function () {
      this.timeout(timeoutTotal);

      try {
        const id = 'id' in fakeData[0] ? fakeData[0].id : fakeData[0]._id;

        const userRec = await app.service('users').get(id);
        await app.service('users').patch(id, { isVerified: true });

        const authLocalMgntClient = client.service('authManagement');
        //const authLocalMgntClient = app.service('authManagement');

        const result = await authLocalMgntClient.create({
          action: 'passwordChange',
          value: {
            user: {
              email: userRec.email
            },
            oldPassword: userRec.plainPassword,
            password: userRec.plainNewPassword,
          },
        });

        const user = await app.service('users').get(fakeData[0].id);

        assert.strictEqual(result.isVerified, true, 'isVerified not true');
        assert.isOk(bcrypt.compareSync(user.plainNewPassword, user.password), 'wrong password');
      } catch (err) {
        console.log(err);
        assert.strictEqual(err, null, 'err code set');
      }
    });
/*
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
    */
  });
});

// Helpers

// Similar to src/index.js
function configServer(port1) {
  const app1 = appJs();
  server = app1.listen(port1);

  return new Promise(resolve => {
    server.on('listening', () => {
      setTimeout(() => {
        resolve(app1);
      }, delayAfterServerOnce);
    });
  });
}

// Similar to config/default.json
function configDefaultJsonAuthentication() {
  return {
    "secret": "f00a1093efd44f1c23e58f2e03eeb2f1220b637f4953f380f0db93b58ee316492b0e13505040a57922b4d3f2dd633d55b8ae2d82f880688e8d707f33347987d1452dbe16f683767a4d07f8e31d4619d50f05fc29efcba4e6aaf3779af8a499cef0fbf6a923eb4b38880a04266f5817c4d4ab67ffed260d5c278b9e3775eb0afef8091f5b2e9216a963d3fe6ba5393cf92dd62ae4191c422bff301a5d32d29fd02c6f1067f2fd2b5a8c99e3337745e6ce6534bd123678b6b2f10303506436735803c41b6c8a73461ae7fb51b1a4c48c79825233a89185a222176b9b25dbe9893a0b2b3baddb6c2ddb5f793f8a723869be09db3bd2f4b963fef7bcbf10b9cd4868",
    "strategies": [
      "jwt",
      "local"
    ],
    "path": "/authentication",
    "service": "users",
    "jwt": {
      "header": {
        "typ": "access"
      },
      "audience": "https://192.168.2.111",
      "subject": "anonymous",
      "issuer": "feathers",
      "algorithm": "HS256",
      "expiresIn": "10d"
    },
    "local": {
      "entity": "users",
      "usernameField": "email",
      "passwordField": "password"
    },
  }
}

// Similar to src/app.js
function appJs() {
  const app1 = express(feathers());
  // app1.configure(configuration());
  // app1.configure(express.rest());
  app1.configure(socketio());

  authenticationJs(app1);
  servicesIndexJs(app1);

  return app1;
}

// Similar to src/authentication.js
function authenticationJs(app1) {
  const config = configDefaultJsonAuthentication();

  app1.configure(authentication(config));
  app1.configure(jwt());
  app1.configure(local());

  // The `authentication` service is used to create a JWT.
  // The before `create` hook registers strategies that can be used
  // to create a new valid JWT (e.g. local or oauth2)
  console.log('authenticationJs', config.strategies);

  app1.service('authentication').hooks({
    before: {
      // comment out this line and test can login but but context.params.user === undefined
      create: authentication.hooks.authenticate(config.strategies), // ['jwt', 'local']
      remove: authentication.hooks.authenticate('jwt'),
    },
  });
}

// Similar to src/services/index.js
function servicesIndexJs(app1) {
  servicesUsersUsersServiceJs(app1);

  app1.configure(authLocalMgnt({
    // ... config
  }));

  app1.service('authManagement').hooks({
    before: {
      create: [
        authenticate('jwt'), // ?? I assume this adds params.user ??????????????????????????????????
        context => {
          console.log(`.authManagement hook create. context.provider=${context.provider}`);
          console.log(`.authManagement hook create. context.data=`, context.data);
          console.log('.authManagement hook create. Object.keys(context.params)=', Object.keys(context.params));
          context.data.authUser = context.params.user;
          console.log('.authManagement hook create. new context.data=', context.data);
          return context;
        }
      ],
    }
  })
}

// Similar to src/services/users/users.service.js
function servicesUsersUsersServiceJs(app1) {
  // feathers-memory
  let Model = modelsUsersModelJs(app1);
  let paginate = null;

  let options = {
    Model,
    paginate,
  };

  app1.use('/users', feathersMemory(options));

  const service = app1.service('users');
  service.hooks(servicesUsersUsersHooksJs(app1));
}

// Similar to src/models/users.model.js
function modelsUsersModelJs() {
  // feathers-memory
  return undefined;
}

// Similar to src/services/users/users.hooks.js
function servicesUsersUsersHooksJs(app1) {
  return {
    before: {
      //all: debug(),
      find: [ authenticate('jwt'), isVerified() ],
      get: [ authenticate('jwt'), isVerified() ],
      create: [ hashPasswordAndTokens(), isVerified(), addVerification() ],
      update: [  hashPassword(), authenticate('jwt'), isVerified() ],
      patch: [  hashPasswordAndTokens(), authenticate('jwt'), isVerified() ],
      remove: [ authenticate('jwt'), isVerified() ]
    },
    after: {
      all: protect('password'), /* Must always be the last hook */
    },
  };
}

async function configClient(host, port, email1, password1, timeoutSocketio) {
  const socket = io(`http://${host}:${port}`, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    extraHeaders: {},
    timeout: timeoutSocketio,
  });
  client = feathersClient();

  client.configure(feathersClient.socketio(socket));
  client.configure(feathersClient.authentication({
    storage: localStorage
  }));

  try {
    await client.authenticate({
      strategy: 'local',
      email: email1,
      password: password1,
    });
    console.log('    ... client authenticated');
  } catch (err) {
    console.log('    ... client could not authenticate.', err);
    throw new Error(`Unable to authenticate: ${err.message}`);
  }

  const usersService = client.service('users');
  console.log(`    ... users service ${typeof usersService === 'object' ? '' : 'NOT '} found on client.`);
  const authLocalMgntService = client.service('authManagement');
  console.log(`    ... authManagement service ${typeof authLocalMgntService === 'object' ? '' : 'NOT '} found on client.`);

  return client;
}

function sanitizeUserForEmail(user) {
  const user1 = clone(user);
  delete user1.password;
  return user1;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

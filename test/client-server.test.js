
const assert = require('chai').assert;
const bcrypt = require('bcryptjs');
const feathers = require('@feathersjs/feathers');
const feathersMemory = require('feathers-memory');
const authLocalMgnt = require('../src/index');
const { localManagementHook } = require('../src/hooks/index');
const { timeoutEachTest } = require('./helpers/config');

const express = require('@feathersjs/express');
const configuration = require('@feathersjs/configuration');
const authentication = require('@feathersjs/authentication');
const jwt = require('@feathersjs/authentication-jwt');
const local = require('@feathersjs/authentication-local');
const socketio = require('@feathersjs/socketio');
const feathersClient = require('@feathersjs/client');
const io = require('socket.io-client');
const { localStorage, readJsonFileSync } = require('@feathers-plus/test-utils');
const { authenticate } = require('@feathersjs/authentication').hooks;
const { hashPassword, protect } = require('@feathersjs/authentication-local').hooks;
const { addVerification, isVerified } = require('../src/hooks');
const { debug } = require('feathers-hooks-common');

const delayAfterServerOnce = 500;
const delayAfterServerClose = 500;
const timeoutTotal = 60000;
const timeoutSocketio = 20000;
const timeoutAuthenticationClient = 20000;
const timeoutAuthLocalMgntClient = 20000;

const host = 'localhost';
const port = 3030;
const email = 'login@example.com';
const password = 'login';
const email2 = 'login@example2.com';
const password2 = 'login2';

const fakeData = [
  { id: 1, email, plainPassword: password, password, plainNewPassword: `00${password}00` },
  { id: 2, email: email2, plainPassword: password2, password: password2, plainNewPassword: `00${password2}00` },
];

let app;
let server;
let client;

// Tests
describe('client-server.test.js', function () {
  this.timeout(timeoutTotal);

  describe('authenticated user', () => {
    before(async function () {
      this.timeout(timeoutTotal);

      app = await configServer(port);
      console.log('    ... server configured.');

      // Seed database once to save hashing time
      const usersService = app.service('users');
      await usersService.remove(null);
      const db = await usersService.create(clone(fakeData));
      console.log('    ... database seeded.');

      client = await configClient(host, port, email, password,
        timeoutSocketio, timeoutAuthenticationClient, timeoutAuthLocalMgntClient);
      console.log('    ... client configured');
    });

    beforeEach(async () => {});

    after(function (done) {
      this.timeout(timeoutTotal);

      client.logout();
      server.close();
      setTimeout(() => done(), delayAfterServerClose);
    });

    it('authenticated user can mutation self', async function () {
      this.timeout(timeoutTotal);

      try {
        const id = 'id' in fakeData[0] ? fakeData[0].id : fakeData[0]._id;

        const userRec = await app.service('users').get(id);
        await app.service('users').patch(id, { isVerified: true });

        const authLocalMgntClient = client.service('authManagement');
        authLocalMgntClient.timeout = timeoutAuthLocalMgntClient; // 60000

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
        throw err
      }
    });

    it('authenticated user cannot mutation another user', async function () {
      this.timeout(timeoutTotal);

      try {
        const id = 'id' in fakeData[1] ? fakeData[1].id : fakeData[1]._id;

        const userRec = await app.service('users').get(id);
        await app.service('users').patch(id, { isVerified: true });

        const authLocalMgntClient = client.service('authManagement');
        authLocalMgntClient.timeout = timeoutAuthLocalMgntClient; // 60000

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

        assert(false, 'Unexpectedly succeeded.');
      } catch (err) {
        if (err.messahe === 'Unexpectedly succeeded.') throw err;

        console.log(err);
        assert.equal((err.errors || {}).$className, 'not-own-acct');
      }
    });
  });

  describe('unauthenticated user', () => {
    before(async function () {
      this.timeout(timeoutTotal);

      app = await configServer(port);
      console.log('    ... server configured.');

      // Seed database once to save hashing time
      const usersService = app.service('users');
      await usersService.remove(null);
      const db = await usersService.create(clone(fakeData));
      console.log('    ... database seeded.');

      client = await configClient(host, port, email, password,
        timeoutSocketio, timeoutAuthenticationClient, timeoutAuthLocalMgntClient);
      console.log('    ... client configured');
    });

    beforeEach(async () => {});

    after(function (done) {
      this.timeout(timeoutTotal);

      client.logout();
      server.close();
      setTimeout(() => done(), delayAfterServerClose);
    });

    it('cannot call authenticated route', async function () {
      this.timeout(timeoutTotal);

      try {
        const id = 'id' in fakeData[1] ? fakeData[1].id : fakeData[1]._id;

        const userRec = await app.service('users').get(id);
        await app.service('users').patch(id, { isVerified: true });

        const authLocalMgntClient = client.service('authManagement');
        authLocalMgntClient.timeout = timeoutAuthLocalMgntClient; // 60000

        await authLocalMgntClient.create({
          action: 'passwordChange',
          value: {
            user: {
              email: userRec.email
            },
            oldPassword: userRec.plainPassword,
            password: userRec.plainNewPassword,
          },
        });

        assert(false, 'Unexpectedly succeeded.');
      } catch (err) {
        if (err.messahe === 'Unexpected succeeded.') throw err;

        console.log(err);
        assert.equal((err.errors || {}).$className, 'not-own-acct');
      }
    });
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
    "service": "users", // path of the users service
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
      "entity": "user", // place authenticated user in context.params[entity]
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
  app1.service('authentication').hooks({
    before: {
      // comment out this line and test can login but context.params.user === undefined
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
      create: localManagementHook()
    }
  });
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
      create: [ hashPassword(), isVerified(), addVerification() ],
      update: [  hashPassword(), authenticate('jwt'), isVerified() ],
      patch: [  hashPassword(), authenticate('jwt'), isVerified() ],
      remove: [ authenticate('jwt'), isVerified() ]
    },
    after: {
      all: protect('password'), /* Must always be the last hook */
    },
  };
}

async function configClient(host, port, email1, password1,
  timeoutSocketio = 20000, timeoutAuthenticationClient = 20000, timeoutAuthLocalMgntClient = 20000
) {
  const socket = io(`http://${host}:${port}`, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    extraHeaders: {},
    timeout: timeoutSocketio, // 60000
  });
  client = feathersClient();

  client.configure(feathersClient.socketio(socket));
  client.configure(feathersClient.authentication({
    storage: localStorage,
    timeout:  timeoutAuthenticationClient, // 60000
  }));

  if (email1) {
    console.log('    ... authenticating client');

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
  }

  const authLocalMgntClient = client.service('authManagement');
  authLocalMgntClient.timeout = timeoutAuthLocalMgntClient; // 60000

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

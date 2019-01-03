
const assert = require('chai').assert;
const feathers = require('@feathersjs/feathers');
const authManagement = require('../src/index');

const optionsDefault = {
  app: null, // assigned during initialization
  service: '/users', // need exactly this for test suite
  path: 'authManagement',
  // token's length will be twice this.
  // resetPassword token will be twice this + id/_id length + 3
  longTokenLen: 15,
  ownAcctOnly: true,
  passwordField: 'password',
  shortTokenLen: 6,
  shortTokenDigits: true,
  delay: 1000 * 60 * 60 * 24 * 5, // 5 days for re/sendVerifySignup
  resetDelay: 1000 * 60 * 60 * 2, // 2 hours for sendResetPwd
  mfaDelay: 1000 * 60 * 60 * 1, // 1 hour for sendMfa
  commandsNoAuth: [ // Unauthenticated users may run these commands
    'resendVerifySignup', 'verifySignupLong', 'verifySignupShort',
    'sendResetPwd', 'resetPwdLong', 'resetPwdShort',
  ],
  identifyUserProps: ['email', 'dialablePhone'],
  plugins: null, // changes top default plugins
};

const userMgntOptions = {
  service: '/users',
  notifier: () => Promise.resolve(),
  shortTokenLen: 8,
};

const orgMgntOptions = {
  service: '/organizations',
  path: 'authManagement/org', // *** specify path for this instance of service
  notifier: () => Promise.resolve(),
  shortTokenLen: 10,
};

function services() {
  const app = this;
  app.configure(user);
  app.configure(organization);
}

function user() {
  const app = this;

  app.use('/users', {
    async create(data) { return data; }
  });

  const service = app.service('/users');

  service.hooks({
    before: { create: authManagement.hooks.addVerification() }
  });
}

function organization() {
  const app = this;

  app.use('/organizations', {
    async create(data) { return data; }
  });

  const service = app.service('/organizations');

  service.hooks({
    before: { create: authManagement.hooks.addVerification('authManagement/org') }, // *** which one
  });
}

describe('scaffolding.test.js', () => {
  describe('can configure 1 service', () => {
    let app;

    beforeEach(() => {
      app = feathers();
      app.configure(authManagement(userMgntOptions));
      app.configure(services);
      app.setup();
    });

    it('configures', () => {
      const options = app.get('localManagement');

      delete options.app;
      delete options.bcryptCompare;
      delete options.authManagementHooks;
      delete options.plugins;

      const expected = Object.assign({}, optionsDefault, userMgntOptions);
      delete expected.app;
      delete expected.bcryptCompare;
      delete expected.authManagementHooks;
      delete expected.plugins;

      assert.deepEqual(options, expected);
    });

    it('can create an item', async () => {
      const user = app.service('/users');

      const result = await user.create({ username: 'John Doe' });
      assert.equal(result.username, 'John Doe');
      assert.equal(result.verifyShortToken.length, 8);
    });

    it('can call service', async () => {
      const authLocalMgntService = app.service('authManagement');

      const result = await authLocalMgntService.create({
        action: 'checkUnique',
        value: {}
      });

      assert.strictEqual(result, null);
    });
  });

  describe('can configure 2 services', () => {
    let app;

    beforeEach(() => {
      app = feathers();
      app.configure(authManagement(userMgntOptions));
      app.configure(authManagement(orgMgntOptions));
      app.configure(services);
      app.setup();
    });

    it('can create items', async () => {
      const user = app.service('/users');
      const organization = app.service('/organizations');

      // create a user item
      const result = await user.create({ username: 'John Doe' })

      assert.equal(result.username, 'John Doe');
      assert.equal(result.verifyShortToken.length, 10);

      // create an organization item
      const result1 = await organization.create({ organization: 'Black Ice' });

      assert.equal(result1.organization, 'Black Ice');
      assert.equal(result1.verifyShortToken.length, 10);
    });

    it('can call services', async () => {
      const authLocalMgntService = app.service('authManagement'); // *** the default
      const authMgntOrgService = app.service('authManagement/org'); // *** which one

      // call the user instance
      const result = await authLocalMgntService.create({
        action: 'checkUnique',
        value: {}
      });

      assert.strictEqual(result, null);

      // call the organization instance
      const result1 = await authMgntOrgService.create({
        action: 'checkUnique',
        value: {}
      });

      assert.strictEqual(result1, null);
    });
  });
});


const assert = require('chai').assert;
const feathers = require('@feathersjs/feathers');
const { hashPasswordAndTokens } = require('../src/index').hooks;
const { timeoutEachTest } = require('./helpers/config');

describe('hash-password-and-tokens.test.js', function () {
  this.timeout(timeoutEachTest);

  let app;
  let context;

  beforeEach(() => {
    app = feathers();
    app.setup();

    context = {
      app,
      type: 'before',
      method: 'create',
      params: { provider: 'socketio' },
      data: {},
    };
  });

  it('hashes password and tokens', async () => {
    context.data.password = '0000000000';
    context.data.verifyToken = '000';
    context.data.resetToken = '000';
    context.data.resetShortToken = '000000';

    const newContext = await hashPasswordAndTokens()(context);

    assert.isAtLeast(newContext.data.password.length, 15, 'password');
    assert.isAtLeast(newContext.data.verifyToken.length, 15, 'verifyToken');
    assert.isAtLeast(newContext.data.resetToken.length, 15, 'resetToken');
    assert.isAtLeast(newContext.data.resetShortToken.length, 15, 'resetShortToken');
  });

  it('hashes null password and tokens', async () => {
    context.data.password = null;
    context.data.verifyToken = null;
    context.data.resetToken = null;
    context.data.resetShortToken = null;

    const newContext = await hashPasswordAndTokens()(context);

    assert.isNull(newContext.data.password, 'password');
    assert.isNull(newContext.data.verifyToken, 'verifyToken');
    assert.isNull(newContext.data.resetToken, 'resetToken');
    assert.isNull(newContext.data.resetShortToken, 'resetShortToken');
  });
});

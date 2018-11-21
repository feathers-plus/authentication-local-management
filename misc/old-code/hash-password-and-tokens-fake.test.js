
const assert = require('chai').assert;
const { hashPasswordAndTokens, bcryptCompare } = require('./helpers/hash-password-and-tokens-fake');
const { timeoutEachTest } = require('./helpers/config');

describe('hash-password-and-tokens-fakes.test.js', function () {
  this.timeout(timeoutEachTest);

  let context;

  beforeEach(() => {
    context = {
      type: 'before',
      method: 'create',
      params: { provider: 'socketio' },
      data: {},
    };
  });

  it('hashes password and tokens', async () => {
    context.data.password = '0000000000';
    context.data.verifyToken = '000';
    context.data.resetToken = '0000';
    context.data.resetShortToken = '000000';

    const newContext = await hashPasswordAndTokens()(context);

    assert.equal(newContext.data.password, '__0000000000', 'password');
    assert.equal(newContext.data.verifyToken, '__000', 'verifyToken');
    assert.equal(newContext.data.resetToken, '__0000', 'resetToken');
    assert.equal(newContext.data.resetShortToken, '__000000', 'resetShortToken');
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

  it('compares plain to hashed', async () => {
    context.data.password = '0000000000';
    context.data.verifyToken = '000';
    context.data.resetToken = '0000';
    context.data.resetShortToken = '000000';

    const newContext = await hashPasswordAndTokens()(context);

    return new Promise((resolve, reject) => {
      bcryptCompare('000', newContext.data.verifyToken, (err, result) =>
        (err || !result) ? reject(err) : resolve()
      );
    });
  })
});

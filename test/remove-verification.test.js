
const assert = require('chai').assert;
const { removeVerification } = require('../src/index').hooks;

let context;

describe('remove-verification.test.js', () => {
  beforeEach(() => {
    context = {
      type: 'after',
      method: 'create',
      params: { provider: 'socketio' },
      result: {
        email: 'a@a.com',
        password: '0000000000',
        isVerified: true,
        verifyExpires: Date.now(),
        verifyToken: '000',
        verifyShortToken: '999',
        verifyChanges: {},
        resetExpires: Date.now(),
        resetToken: '000',
        resetShortToken: '999',
        mfaExpires: Date.now(),
        mfaShortToken: '999',
        mfaType: '2fa',
      },
    };
  });

  it('works with verified user', () => {
    assert.doesNotThrow(() => { removeVerification()(context); });

    const user = context.result;
    assert.property(user, 'isVerified');
    assert.equal(user.isVerified, true);
    assert.notProperty(user, 'verifyExpires');
    assert.notProperty(user, 'verifyToken');
    assert.notProperty(user, 'verifyShortToken');
    assert.notProperty(user, 'verifyChanges');
    assert.notProperty(user, 'resetExpires');
    assert.notProperty(user, 'resetToken');
    assert.notProperty(user, 'resetShortToken');
    assert.notProperty(user, 'mfaExpires');
    assert.notProperty(user, 'mfaShortToken');
    assert.notProperty(user, 'mfaType');
  });

  it('works with unverified user', () => {
    context.result.isVerified = false;

    assert.doesNotThrow(() => { removeVerification()(context); });

    const user = context.result;
    assert.property(user, 'isVerified');
    assert.equal(user.isVerified, false);
    assert.notProperty(user, 'verifyExpires');
    assert.notProperty(user, 'verifyToken');
    assert.notProperty(user, 'verifyShortToken');
    assert.notProperty(user, 'verifyChanges');
    assert.notProperty(user, 'resetExpires');
    assert.notProperty(user, 'resetToken');
    assert.notProperty(user, 'resetShortToken');
    assert.notProperty(user, 'mfaExpires');
    assert.notProperty(user, 'mfaShortToken');
    assert.notProperty(user, 'mfaType');
  });

  it('works if addVerification not run', () => {
    context.result = {};

    assert.doesNotThrow(() => { removeVerification()(context); });
  });

  it('noop if server initiated', () => {
    context.params.provider = undefined;
    assert.doesNotThrow(() => { removeVerification()(context); });

    const user = context.result;
    assert.property(user, 'isVerified');
    assert.equal(user.isVerified, true);
    assert.property(user, 'verifyExpires');
    assert.property(user, 'verifyToken');
    assert.property(user, 'verifyShortToken');
    assert.property(user, 'verifyChanges');
    assert.property(user, 'resetExpires');
    assert.property(user, 'resetToken');
    assert.property(user, 'resetShortToken');
    assert.property(user, 'mfaExpires');
    assert.property(user, 'mfaShortToken');
    assert.property(user, 'mfaType');
  });

  it('works with multiple verified user', () => {
    context.result = [context.result, context.result]
    assert.doesNotThrow(() => { removeVerification()(context); });

    context.result.forEach(user => {
      assert.property(user, 'isVerified');
      assert.equal(user.isVerified, true);
      assert.notProperty(user, 'verifyExpires');
      assert.notProperty(user, 'verifyToken');
      assert.notProperty(user, 'verifyShortToken');
      assert.notProperty(user, 'verifyChanges');
      assert.notProperty(user, 'resetExpires');
      assert.notProperty(user, 'resetToken');
      assert.notProperty(user, 'resetShortToken');
      assert.notProperty(user, 'mfaExpires');
      assert.notProperty(user, 'mfaShortToken');
      assert.notProperty(user, 'mfaType');
    })
  });

  it('does not throw with damaged hook', () => {
    delete context.result;

    assert.doesNotThrow(() => { removeVerification()(context); });
  });

  it('throws if not after', () => {
    context.type = 'before';

    assert.throws(() => { removeVerification()(context); });
  });
});

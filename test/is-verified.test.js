
const assert = require('chai').assert;
const { isVerified } = require('../src/index').hooks;
const { timeoutEachTest } = require('./helpers/config');


describe('is-verified.test.js', function () {
  this.timeout(timeoutEachTest);
  let context;

  beforeEach(() => {
    context = {
      type: 'before',
      method: 'create',
      params: {
        provider: 'socketio',
        user: { email: 'a@a.com', password: '0000000000' },
      },
    };
  });

  it('throws if not before', () => {
    context.type = 'after';
    assert.throws(() => { isVerified()(context) }, undefined, undefined, 'after');
  });

  it('works with verified used', () => {
    context.params.user.isVerified = true;
    assert.doesNotThrow(() => { isVerified()(context); });
  });

  it('throws with unverified user', () => {
    context.params.user.isVerified = false;
    assert.throws(() => { isVerified()(context); });
  });

  it('throws if addVerification not run', () => {
    assert.throws(() => { isVerified()(context); });
  });

  it('throws if populate not run', () => {
    delete context.params.user;
    assert.throws(() => { isVerified()(context); });
  });

  it('throws with damaged hook', () => {
    delete context.params;
    assert.throws(() => { isVerified()(context); });
  });

  it('throws if not before', () => {
    context.type = 'after';
    assert.throws(() => { isVerified()(context); });
  });
});

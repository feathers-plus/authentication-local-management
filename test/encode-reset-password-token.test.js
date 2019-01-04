
const assert = require('chai').assert;
const { encodeResetPasswordToken } = require('../src/index').helpers;

describe('encode-reset-password-token.test.js', () => {
  it('runs', async () => {
    const result = encodeResetPasswordToken('foo', 'bar');
    assert.strictEqual(result, 'foo___bar');
  });
});

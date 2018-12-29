
const assert = require('chai').assert;
const { concatIDAndHash } = require('../src/index').helpers;

describe('concat-id-and-hash.test.js', () => {
  it('runs', async () => {
    const result = concatIDAndHash('foo', 'bar');
    assert.strictEqual(result, 'foo___bar');
  });
});

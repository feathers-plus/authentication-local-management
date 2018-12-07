
const assert = require('chai').assert;
const crypto = require('crypto');

describe('crypto.test', () => {
  it('test 1', async () => {
    const x = await get();
    assert.equal(x[0], 'aaaaaaaaaaaaaaa');
  });
});

async function get() {
  const x1 = await randomBytes1();
  const x2 = await randomBytes2(10);

  return [x1, x2];
}

function randomBytes1 (len) {
  return new Promise((resolve, reject) => {
    resolve('aaaaaaaaaaaaaaa');
  });
}

function randomBytes2 (len) {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(len, (err, buf) => {
      return err ? reject(err) : resolve(buf.toString('hex'))
    });
  })
}

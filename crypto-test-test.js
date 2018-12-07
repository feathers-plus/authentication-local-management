
const crypto = require('crypto');

const x = get();

async function get() {
  console.log('1');
  const x1 = await randomBytes1();
  console.log('1.1');
  console.log('x1=', x1);

  console.log('2');
  const x2 = await randomBytes2(10);
  console.log('2.1');
  console.log('x2=', x2);

  return [x1, x2];
}


function randomBytes1 (len) {
  return new Promise((resolve, reject) => {
    console.log('..randomBytes before');
    resolve('aaaaaaaaaaaaaaa');
  });
}

function randomBytes2 (len) {
  return new Promise((resolve, reject) => {
    console.log('..........randomBytes before');
    crypto.randomBytes(len, (err, buf) => {
      console.log('..........randomBytes in', typeof err, typeof buf);
      return err ? reject(err) : resolve(buf.toString('hex'))
    });
  })
    .then(result => {
      console.log('..........randomBytes after', result);
      return result;
    })
    .catch(err => {
      console.log('..........randomBytes err', err.message);
      throw err;
    })
}
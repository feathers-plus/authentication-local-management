
const bcrypt = require('bcrypt');
const bcryptjs = require('bcryptjs');
const hash = require('@feathersjs/authentication-local/lib/utils/hash');
const { hashPassword } = require('@feathersjs/authentication-local').hooks;

const NS_PER_SEC = 1e9;
const times = 4;

testSuite();

async function testSuite() {
  console.log('\n0. Warm up the code in case that makes a difference.');
  await runAsyncTest('hashPassword, sequential', async () => await hashPassword()(context()), 1);
  await runAsyncTest('util/hash,    sequential', async () => await hash('aa'), 1);
  await runAsyncTest('util/hash2,   sequential', async () => await hash2('aa'), 1);
  await runAsyncTest('bcrypt,       sequential', async () => await hashBcrypt('aa'), 1);
  await runParallelTest('hashPassword, parallel  ', () => hashPassword()(context()), 1);

  console.log('\n1. hashPassword sequential - check consistency of timings.');
  await runAsyncTest('', async () => await hashPassword()(context()), 1);
  await runAsyncTest('', async () => await hashPassword()(context()), 2);
  await runAsyncTest('', async () => await hashPassword()(context()), 4);

  console.log('\n2. utils/hash sequential - check consistency of timings.');
  await runAsyncTest('', async () => await hash('aa'), 1);
  await runAsyncTest('', async () => await hash('aa'), 2);
  await runAsyncTest('', async () => await hash('aa'), 4);

  console.log('\n3. utils/hash2 sequential - check consistency of timings.');
  await runAsyncTest('', async () => await hash2('aa'), 1);
  await runAsyncTest('', async () => await hash2('aa'), 2);
  await runAsyncTest('', async () => await hash2('aa'), 4);

  console.log('\n4. bcrypt      sequential - check consistency of timings.');
  await runAsyncTest('', async () => await hashBcrypt('aa'), 1);
  await runAsyncTest('', async () => await hashBcrypt('aa'), 2);
  await runAsyncTest('', async () => await hashBcrypt('aa'), 4);

  console.log('\n5. hashPassword parallel - check consistency of timings.');
  await runParallelTest('', () => hashPassword()(context()), 1);
  await runParallelTest('', () => hashPassword()(context()), 2);
  await runParallelTest('', () => hashPassword()(context()), 4);

  console.log('\n6. utils/hash parallel - check consistency of timings.');
  await runParallelTest('', () => hash('aa'), 1);
  await runParallelTest('', () => hash('aa'), 2);
  await runParallelTest('', () => hash('aa'), 4);

  console.log('\n7. utils/hash2 parallel - check consistency of timings.');
  await runParallelTest('', () => hash2('aa'), 1);
  await runParallelTest('', () => hash2('aa'), 2);
  await runParallelTest('', () => hash2('aa'), 4);

  console.log('\n8. hashBycrypt parallel - check consistency of timings.');
  await runParallelTest('', () => hashBcrypt('aa'), 1);
  await runParallelTest('', () => hashBcrypt('aa'), 2);
  await runParallelTest('', () => hashBcrypt('aa'), 4);
}

async function runAsyncTest(desc, func, times) {
  const timers = [];

  for (let i = 0; i < times; i++) {
    await runAsyncFunc(func, timers);
  }

  const avgMs = Math.round((timers.reduce((a, b) => a + b)) / times);
  console.log(`   ${desc} x${times}. Avg/hash=`, [avgMs],
    ' ms. Individual=', timers.map(a => Math.round(a)));
}

async function runAsyncFunc(func, timesMs) {
  const startTime = process.hrtime();

  await func();

  const diff = process.hrtime(startTime);
  const timeMs = (diff[0] * NS_PER_SEC + diff[1])/1000000;
  timesMs.push(timeMs);
}

function runParallelTest(desc, func, times) {
  const promises = [];
  const timers = [];

  for (let i = 0; i < times; i++) {
    promises.push(runParallelFunc(func, timers));
  }

  //  return Promise.all(new Array(times).map(() => runParallelFunc(func)))
  return Promise.all(promises)
    .then(() => {
      const avgMs = Math.round((timers.reduce((a, b) => a + b)) / times);
      console.log(`   ${desc} x${times}. Avg/hash=`, [avgMs],
        ' ms. Individual=', timers.map(a => Math.round(a)));
    });
}

function runParallelFunc(func, timesMs) {
  const startTime = process.hrtime();

  return func()
    .then(() => {
      const diff = process.hrtime(startTime);
      const timeMs = (diff[0] * NS_PER_SEC + diff[1])/1000000;
      timesMs.push(timeMs);
    })
}

function hash2 (password) {
  const BCRYPT_WORK_FACTOR_BASE = 12;
  const BCRYPT_DATE_BASE = 1483228800000;
  const BCRYPT_WORK_INCREASE_INTERVAL = 47300000000;

  return new Promise((resolve, reject) => {
    /* *********************************************************************************************
    let BCRYPT_CURRENT_DATE = new Date().getTime();
    let BCRYPT_WORK_INCREASE = Math.max(0, Math.floor((BCRYPT_CURRENT_DATE - BCRYPT_DATE_BASE) / BCRYPT_WORK_INCREASE_INTERVAL));
    let BCRYPT_WORK_FACTOR = Math.min(19, BCRYPT_WORK_FACTOR_BASE + BCRYPT_WORK_INCREASE);
    ********************************************************************************************* */
    let BCRYPT_WORK_FACTOR = BCRYPT_WORK_FACTOR_BASE;

    bcryptjs.genSalt(BCRYPT_WORK_FACTOR, function (error, salt) {
      if (error) {
        return reject(error);
      }

      bcryptjs.hash(password, salt, function (error, hashedPassword) {
        if (error) {
          return reject(error);
        }

        resolve(hashedPassword);
      });
    });
  });
}

function hashBcrypt (password) {
  const BCRYPT_WORK_FACTOR_BASE = 12;
  const BCRYPT_DATE_BASE = 1483228800000;
  const BCRYPT_WORK_INCREASE_INTERVAL = 47300000000;

  return new Promise((resolve, reject) => {
    let BCRYPT_CURRENT_DATE = new Date().getTime();
    let BCRYPT_WORK_INCREASE = Math.max(0, Math.floor((BCRYPT_CURRENT_DATE - BCRYPT_DATE_BASE) / BCRYPT_WORK_INCREASE_INTERVAL));
    let BCRYPT_WORK_FACTOR = Math.min(19, BCRYPT_WORK_FACTOR_BASE + BCRYPT_WORK_INCREASE);


    bcrypt.genSalt(BCRYPT_WORK_FACTOR, function (error, salt) {
      if (error) {
        return reject(error);
      }

      bcrypt.hash(password, salt, function (error, hashedPassword) {
        if (error) {
          return reject(error);
        }

        resolve(hashedPassword);
      });
    });
  });
}

function context() {
  return {
    app: { get: () => {} },
    type: 'before',
    method: 'create',
    data: {
      password: 'aa',
    },
  };
}

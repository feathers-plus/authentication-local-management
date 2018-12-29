
const assert = require('chai').assert;
const { sendVerifySignupNotification } = require('../src/index').hooks;

function notifierOptions() {
  return {};
}

let pluginsRun;

function makeApp(identifyUserProps) {
  return {
    get() {
      return {
        identifyUserProps,
        plugins: {
          run(trigger, data) {
            pluginsRun.push({ trigger, data });
            return data;
          },
        },
      };
    }
  }
}

describe('prevent-changes-verification.test.js', () => {
  let contextPatch;

  beforeEach(() => {
    pluginsRun = [];

    contextPatch = {
      app: makeApp(['email', 'dialablePhone']),
      method: 'create',
      type: 'after',
      params: { provider: 'rest' },
    };

  });

  it('runs', async () => {
    const result = { email1: 'email1', dialablePhone1: 'dialablePhone1' };
    contextPatch.result = result;

    const ctx = await sendVerifySignupNotification(notifierOptions)(contextPatch);

    assert.deepEqual(pluginsRun, [
      { trigger: 'sanitizeUserForNotifier', data: result},
      { trigger: 'notifier', data: {
          type: 'sendVerifySignup',
          sanitizedUser: result,
          notifierOptions
        }}
    ]);
  });
});

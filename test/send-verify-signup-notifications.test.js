
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

describe('send-verify-signup-notification.test.js', () => {
  let context;

  beforeEach(() => {
    pluginsRun = [];

    context = {
      app: makeApp(['email', 'dialablePhone']),
      method: 'create',
      type: 'after',
      params: { provider: 'rest' },
    };

  });

  it('for full user', async () => {
    const result = { isInvitation: false, email1: 'email1', dialablePhone1: 'dialablePhone1' };
    context.result = result;

    const ctx = await sendVerifySignupNotification(notifierOptions)(context);

    assert.deepEqual(pluginsRun, [
      { trigger: 'sanitizeUserForNotifier', data: result},
      { trigger: 'notifier', data: {
          type: 'sendVerifySignup',
          sanitizedUser: result,
          notifierOptions
        }}
    ]);
  });

  it('for invited user', async () => {
    const result = { isInvitation: true, email1: 'email1', dialablePhone1: 'dialablePhone1' };
    context.result = result;

    const ctx = await sendVerifySignupNotification(notifierOptions)(context);

    assert.deepEqual(pluginsRun, [
      { trigger: 'sanitizeUserForNotifier', data: result},
      { trigger: 'notifier', data: {
          type: 'sendInvitationSignup',
          sanitizedUser: result,
          notifierOptions
        }}
    ]);
  });
});

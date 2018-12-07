
const callNotifier = require('../helpers/call-notifier');

module.exports = sendVerifySignupNotification;

function sendVerifySignupNotification(notifierOptions1, notifyWhen) {
  notifyWhen = notifyWhen || (context => !!context.params.provider);

  const notifierOptions = typeof notifierOptions1 === 'function' ?
    notifierOptions1 : () => notifierOptions1;

  return async context => {
    if (notifyWhen(context)) {
      const options = context.app.get('localManagement');

      await callNotifier(options, 'sendVerifySignup', context.result, notifierOptions());
    }
  };
}

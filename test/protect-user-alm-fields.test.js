
const assert = require('chai').assert;
const { protectUserAlmFields } = require('../src/index').hooks;

function makeApp(userIdentityFields) {
  return {
    get() {
      return { userIdentityFields };
    }
  }
}


describe('prevent-changes-verification.test.js', () => {
  let contextPatch;

  beforeEach(() => {
    contextPatch = {
      app: makeApp(['email', 'dialablePhone']),
      method: 'patch',
      type: 'before',
      params: { provider: 'rest' },
      id: 1,
    };

  });

  it('default verificationFields fields changes', async () => {
    contextPatch.data = { verifyToken: 'aaa' };

    assert.throws(() => protectUserAlmFields()(contextPatch))
  });

  it('default verificationFields field isInvitation changes', async () => {
    contextPatch.data = { isInvitation: false };

    assert.throws(() => protectUserAlmFields()(contextPatch))
  });

  it('explicit verificationFields fields changes', async () => {
    contextPatch.data = { myVerifyToken: 'aaa' };

    assert.throws(() => protectUserAlmFields(
      null, ['myVerifyToken']
    )(contextPatch))
  });

  it('preventWhen works', async () => {
    contextPatch.data = { email: 'email1', dialablePhone: 'dialablePhone1' };
    const result = await protectUserAlmFields(
      () => false
    )(contextPatch);
  });
});

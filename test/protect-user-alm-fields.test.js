
const assert = require('chai').assert;
const { protectUserAlmFields } = require('../src/index').hooks;

function makeApp(identifyUserProps) {
  return {
    get() {
      return { identifyUserProps };
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

  it('no default identifyUserProps fields changes', async () => {
    contextPatch.data = { emailxx: 'email1', dialablePhonexx: 'dialablePhone1' };
    const result = await protectUserAlmFields()(contextPatch);
  });

  it('default identifyUserProps fields changes', async () => {
    contextPatch.data = { email: 'email1', dialablePhone: 'dialablePhone1' };

    assert.throws(() => protectUserAlmFields()(contextPatch))
  });

  it('explicit identifyUserProps works', async () => {
    contextPatch.data = { snailMail: 'email1', dialablePhone: 'dialablePhone1' };

    assert.throws(() => protectUserAlmFields(
      null, ['snailMail']
    )(contextPatch))
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
      null, null, ['myVerifyToken']
    )(contextPatch))
  });

  it('preventWhen works', async () => {
    contextPatch.data = { email: 'email1', dialablePhone: 'dialablePhone1' };
    const result = await protectUserAlmFields(
      () => false
    )(contextPatch);
  });
});
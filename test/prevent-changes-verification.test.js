
const assert = require('chai').assert;
const { preventChangesVerification } = require('../src/index').hooks;

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
    const result = await preventChangesVerification()(contextPatch);
  });

  it('default identifyUserProps fields changes', async () => {
    contextPatch.data = { email: 'email1', dialablePhone: 'dialablePhone1' };

    assert.throws(() => preventChangesVerification()(contextPatch))
  });

  it('explicit identifyUserProps works', async () => {
    contextPatch.data = { snailMail: 'email1', dialablePhone: 'dialablePhone1' };

    assert.throws(() => preventChangesVerification(
      null, ['snailMail']
    )(contextPatch))
  });

  it('default verificationFields fields changes', async () => {
    contextPatch.data = { verifyToken: 'aaa' };

    assert.throws(() => preventChangesVerification()(contextPatch))
  });

  it('default verificationFields field isInvitation changes', async () => {
    contextPatch.data = { isInvitation: false };

    assert.throws(() => preventChangesVerification()(contextPatch))
  });

  it('explicit verificationFields fields changes', async () => {
    contextPatch.data = { myVerifyToken: 'aaa' };

    assert.throws(() => preventChangesVerification(
      null, null, ['myVerifyToken']
    )(contextPatch))
  });

  it('preventWhen works', async () => {
    contextPatch.data = { email: 'email1', dialablePhone: 'dialablePhone1' };
    const result = await preventChangesVerification(
      () => false
    )(contextPatch);
  });
});


const { hashPassword } = require('@feathersjs/authentication-local').hooks;

module.exports = {
  hashPasswordAndTokens,
  bcryptCompare,
  bcryptCompareSync,
};

function hashPasswordAndTokens(password, verifyToken, resetToken, resetShortToken) {
  return async (context) => {
    const data = Array.isArray(context.data) ? context.data : [context.data];
    const props = [
      password || 'password',
      verifyToken || 'verifyToken',
      resetToken || 'resetToken',
      resetShortToken || 'resetShortToken'
    ]

    data.forEach(rec => {
      props.forEach(name => {
        if (name in rec && rec[name] !== null && rec[name] !== undefined) {
          rec[name] = `__${rec[name]}`;
        }
      });
    });

    return context;
  };
}

function bcryptCompare(plain, hashed, cb) {
  cb(null, hashed === `__${plain}`);
}

function bcryptCompareSync(plain, hashed) {
  return hashed === `__${plain}`;
}
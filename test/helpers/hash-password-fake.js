
module.exports = {
  hashPassword,
  bcryptCompare,
  bcryptCompareSync
};

function hashPassword (password = 'password') {
  return async (context) => {
    const data = Array.isArray(context.data) ? context.data : [context.data];
    const props = [
      password || 'password',
    ];

    data.forEach(rec => {
      if (password in rec && rec[password] !== null && rec[password] !== undefined) {
        rec[password] = `__${rec[password]}`;
      }
    });

    return context;
  };
}

function bcryptCompare (plain, hashed, cb) {
  cb(null, hashed === `__${plain}`);
}

function bcryptCompareSync (plain, hashed) {
  return hashed === `__${plain}`;
}

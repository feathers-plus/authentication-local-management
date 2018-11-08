
module.exports = comparePasswords;

function comparePasswords (oldPassword, password, getError, bcryptCompare) {
  return new Promise((resolve, reject) => {
    bcryptCompare(oldPassword, password, (err, data1) =>
      (err || !data1) ? reject(getError() || err) : resolve()
    );
  });
}

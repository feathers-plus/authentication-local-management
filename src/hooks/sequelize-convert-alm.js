
const { sequelizeConvert, getItems, replaceItems } = require('feathers-hooks-common');

module.exports = sequelizeConvertAlm;

function sequelizeConvertAlm (converts, ignores, conversions) {
  converts = converts || {
    isInvitation: 'boolean',
    isVerified: 'boolean',
    verifyExpires: 'date',
    verifyChanges: 'json',
    resetExpires: 'date',
    mfaExpires: 'date',
    passwordHistory: 'json',
  };

  return sequelizeConvert (converts, ignores, conversions);
}


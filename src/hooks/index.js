
const addVerification = require('./add-verification');
const sequelizeConvertAlm = require('./sequelize-convert-alm');
const isVerified = require('./is-verified');
const localManagementHook = require('./local-management-hook');
const protectUserAlmFields = require('./protect-user-alm-fields');
const removeVerification = require('./remove-verification');
const sendVerifySignupNotification = require('./send-verify-signup-notification');

module.exports = {
  addVerification,
  sequelizeConvertAlm,
  isVerified,
  localManagementHook,
  protectUserAlmFields,
  removeVerification,
  sendVerifySignupNotification
};

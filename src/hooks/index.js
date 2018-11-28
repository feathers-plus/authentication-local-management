
const addVerification = require('./add-verification');
const conversionSql = require('./conversion-sql');
const isVerified = require('./is-verified');
const localManagementHook = require('./local-management-hook');
const preventChangesVerification = require('./prevent-changes-verification');
const removeVerification = require('./remove-verification');
const sendVerifySignupNotification = require('./send-verify-signup-notification');

module.exports = {
  addVerification,
  conversionSql,
  isVerified,
  localManagementHook,
  preventChangesVerification,
  removeVerification,
  sendVerifySignupNotification,
};

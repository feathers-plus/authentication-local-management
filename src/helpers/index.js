
const callNotifier = require('./call-notifier');
const cloneObject = require('./clone-object');
const comparePasswords = require('./compare-passwords');
const concatIDAndHash = require('./concat-id-and-hash');
const deconstructId = require('./deconstruct-id');
const ensureFieldHasChanged = require('./ensure-field-has-changed');
const ensureObjPropsValid = require('./ensure-obj-props-valid');
const ensureValuesAreStrings = require('./ensure-values-are-strings');
const getId = require('./get-id');
const getLongToken = require('./get-long-token');
const getShortToken = require('./get-short-token');
const getUserData = require('./get-user-data');
const isNullsy = require('./is-nullsy');
const randomBytes = require('./random-bytes');
const randomDigits = require('./random-digits');
const sanitizeUserForClient = require('./sanitize-user-for-client');
const sanitizeUserForNotifier = require('./sanitize-user-for-notifier');

module.exports = {
  callNotifier,
  cloneObject,
  comparePasswords,
  concatIDAndHash,
  deconstructId,
  ensureFieldHasChanged,
  ensureObjPropsValid,
  ensureValuesAreStrings,
  getId,
  getLongToken,
  getShortToken,
  getUserData,
  isNullsy,
  randomBytes: (...args) => randomBytes(...args), // for testing, make safe from hacking
  randomDigits: (...args) => randomDigits(...args), // for testing, make safe from hacking
  sanitizeUserForClient,
  sanitizeUserForNotifier
};

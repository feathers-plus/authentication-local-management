
const { getItems, replaceItems } = require('feathers-hooks-common');

const methodsWithData = ['create', 'update', 'patch'];

module.exports = conversionSql;

function conversionSql (convertDatetime, convertVerifyChanges, ignore = []) {
  convertDatetime = convertDatetime || {
    before: dateNow => dateNow,
    after: sqlDate => new Date(sqlDate).valueOf()
  };

  convertVerifyChanges = convertVerifyChanges || {
    before: obj => JSON.stringify(obj),
    after: str => JSON.parse(str)
  };

  const ifIsInvitation = !ignore.includes('isInvitation');
  const ifIsVerified = !ignore.includes('isVerified');
  const ifVerifyExpires = !ignore.includes('verifyExpires');
  // const ifVerifyToken = !ignore.includes('verifyToken');
  // const ifVerifyShortToken = !ignore.includes('verifyShortToken');
  const ifVerifyChanges = !ignore.includes('verifyChanges');
  const ifResetExpires = !ignore.includes('resetExpires');
  // const ifResetToken = !ignore.includes('resetToken');
  // const ifResetShortToken = !ignore.includes('resetShortToken');
  const ifMfaExpires = !ignore.includes('mfaExpires');
  // const ifMfaShortToken = !ignore.includes('mfaShortToken');
  // const ifMfaType = !ignore.includes('mfaType');

  return context => {
    if (context.type === 'before' && !methodsWithData.includes(context.method)) return context;

    const items = getItems(context);
    const recs = Array.isArray(items) ? items : [items];

    if (recs) {
      recs.forEach(rec => {
        if (context.type === 'before') {
          if (ifIsInvitation && 'isInvitation' in rec) {
            rec.isInvitation = rec.isInvitation ? 1 : 0;
          }
          if (ifIsVerified && 'isVerified' in rec) {
            rec.isVerified = rec.isVerified ? 1 : 0;
          }
          if (ifVerifyExpires && 'verifyExpires' in rec) {
            rec.verifyExpires = convertDatetime.before(rec.verifyExpires);
          }
          if (ifVerifyChanges && 'verifyChanges' in rec) {
            rec.verifyChanges = convertVerifyChanges.before(rec.verifyChanges);
          }
          if (ifResetExpires && 'resetExpires' in rec) {
            rec.resetExpires = convertDatetime.before(rec.resetExpires);
          }
          if (ifMfaExpires && 'mfaExpires' in rec) {
            rec.mfaExpires = convertDatetime.before(rec.mfaExpires);
          }
        }

        if (context.type === 'after') {
          if (ifIsInvitation && 'isInvitation' in rec) {
            rec.isInvitation = !!rec.isInvitation;
          }
          if (ifIsVerified && 'isVerified' in rec) {
            rec.isVerified = !!rec.isVerified;
          }
          if (ifVerifyExpires && 'verifyExpires' in rec) {
            rec.verifyExpires = convertDatetime.after(rec.verifyExpires);
          }
          if (ifVerifyChanges && 'verifyChanges' in rec) {
            rec.verifyChanges = convertVerifyChanges.after(rec.verifyChanges);
          }
          if (ifResetExpires && 'resetExpires' in rec) {
            rec.resetExpires = convertDatetime.after(rec.resetExpires);
          }
          if (ifMfaExpires && 'mfaExpires' in rec) {
            rec.mfaExpires = convertDatetime.after(rec.mfaExpires);
          }
        }
      });
    }

    replaceItems(context, items);
    return context;
  };
}

/*
 Conversions

 Field name         Internal            Sequelize & Knex
-----------         --------            ----------------
 isVerified         Boolean             INTEGER, 1/0 ????? is TINYINT/SMALLINT overkill?
 verifyExpires      Date.now()          BIGINT ????? or should it be DATE = new Date(Date.now())?
 verifyToken        String(30 default)  STRING
 verifyShortToken   String(6 default)   STRING
 verifyChanges      Object              STRING, JSON.stringify ????? JSON not all DB

 resetExpires       Date.now()          BIGINT ?????
 resetToken         String(30 default)  STRING
 resetShortToken    String(6 default)   STRING

 Notes:
 - isVerified: If the user's email addr has been verified (boolean)
 - verifyToken: The 30-char token generated for email addr verification (string)
 - verifyShortToken: The 6-digit token generated for cellphone addr verification (string)
 - verifyExpires: When the email addr token expire (Date)
 - verifyChanges: key-value map. New values to apply on verification to some identifyUserProps (see below).
 - resetToken: The 30-char token generated for forgotten password reset (string)
 - resetShortToken: The 6-digit token generated for forgotten password reset (string)
 - resetExpires: When the forgotten password token expire (Date)

 - Rather confused if a column type of DATE should be used, and how to set its value, so it works
   for all DBs and Sequelize/Knex. Or should we go with BIGINT & Date.now().
 - There seems to be issues looking at https://github.com/sequelize/sequelize/issues/7879#issuecomment-329971730
 - My inclination is to go with BIGINT and Date.now() to be compatible with  the createdAt
   and updatedAt hooks.

 - identifyUserProps: Prop names in user item which uniquely identify the user,
   e.g. ['username', 'email', 'cellphone']. The default is ['email']. The prop values must be strings.
   Only these props may be changed with verification by the service.
   At least one of these props must be provided whenever a short token is used,
   as the short token alone is too susceptible to brute force attack.

 - feathers-hooks-common is slowly standardizing on 1/0 for Boolean and Date.now().
 */

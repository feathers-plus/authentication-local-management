### Coerce fields for Sequelize and Knex

The second most common issue raised with f-a-m was how to use it with Sequelize/Knex.
f-a-m expected the user-entity model to be in a JS-friendly format,
and the dev was expected to use hooks to reformat that to the Sequelize/Knex model.

The conversionSql hook has been introduced as a convenience.
It converts the isVerified, verifiedExpires, verifyChanges, resetExpires fields created by this repo.
Its used on the user-entity as follows:
```js
const { conversionSql } = require('authentication-local-management').hooks;

module.exports = {
  before: {
    all: conversionSql(),
  },
  after: {
    all: conversionSql(),
  },
};
```

By default it converts
```txt
 Field name         Internal            Sequelize & Knex
-----------         --------            ----------------
 isInvitation       Boolean             INTEGER
 isVerified         Boolean             INTEGER
 verifyExpires      Date.now()          DATE (*)
 verifyChanges      Object              STRING, JSON.stringify
 resetExpires       Date.now()          DATE (*)
 mfaExpires         Date.now()          DATE (*)
 passwordHistory    Array               STRING, JSON.stringify
```

(*) The hook passes the 2 datetimes to the adapter as Date.now() when used as a before hook.
The adapter converts them to the DB format.
The hook itself converts the datetimes back to Date.now() when run as an after hook.

There are options to
- Customize the datetime conversion,
- Customize the convertNonSqlType conversion,
- Skip converting any of these fields.

The test/sequelize.test.js module uses the feathers-sequelize adapter with an sqlite3 table created with
```txt
authentication-local-management$ touch ./test-data/users.sqlite
authentication-local-management$ sqlite3 ./test-data/users.sqlite
SQLite version 3.19.3 2017-06-08 14:26:16
Enter ".help" for usage hints.
sqlite> .schema
sqlite> CREATE TABLE 'Users' ('id' INTEGER PRIMARY KEY AUTOINCREMENT,
  'email'            VARCHAR( 60),
  'password'         VARCHAR( 60), 
  'phone'            VARCHAR( 30),
  'dialablePhone'    VARCHAR( 15),
  'preferredComm'    VARCHAR(  5),
  'isInvitation'     INTEGER,
  'isVerified'       INTEGER, 
  'verifyExpires'    DATETIME, 
  'verifyToken'      VARCHAR( 60),
  'verifyShortToken' VARCHAR(  8), 
  'verifyChanges'    VARCHAR(255), 
  'resetExpires'     INTEGER, 
  'resetToken'       VARCHAR( 60), 
  'resetShortToken'  VARCHAR(  8),
  'mfaExpires'       INTEGER, 
  'mfaShortToken'    VARCHAR(  8),
  'mfaType'          VARCHAR(  5),
  'passwordHistory'  VARCHAR(512),
  'createdAt'        DATETIME,
  'updatedAt'        DATETIME
   );
sqlite> .quit
```

Module users.sequelize.js much be customized to reflect the changes conversionSql makes:

```js
  sequelizeClient.define('users',
    {
      email: {
        type: DataTypes.STRING,
        allowNull: false
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false
      },
      dialablePhone: {
        type: DataTypes.STRING,
        allowNull: false
      },
      preferredComm: {
        type: DataTypes.STRING,
        allowNull: false
      },
      isInvitation: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      isVerified: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      verifyExpires: {
        type: DataTypes.DATE
      },
      verifyToken: {
        type: DataTypes.STRING,
        allowNull: false
      },
      verifyShortToken: {
        type: DataTypes.STRING,
        allowNull: false
      },
      verifyChanges: {
        type: DataTypes.STRING
      },
      resetExpires: {
        type: DataTypes.DATE
      },
      resetToken: {
        type: DataTypes.STRING,
        allowNull: false
      },
      resetShortToken: {
        type: DataTypes.STRING,
        allowNull: false
      },
      mfaExpires: {
        type: DataTypes.DATE
      },
      mfaShortToken: {
        type: DataTypes.STRING,
        allowNull: false
      },
      mfaType: {
        type: DataTypes.STRING,
        allowNull: false
      },
      passwordHistory: {
        type: DataTypes.STRING
      },
    },
    {
      hooks: {
        beforeCount(options) {
          options.raw = true;
        },
      },
    },
  );
```
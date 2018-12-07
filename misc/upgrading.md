# upgrading feathers-authentication-management (a.k.a. f-a-m) to authentication-local-management (a.k.a. a-l-m)

## Breaking changes

### Encryption of password and tokens

f-a-m encrypted the password internally.
The most common issue occurring in that repo was the app rehashing the password in the before hooks.
The app had to run hashPassword in the hooks only if the service had not been by the repo.

Related to this, some devs asked about the possibility to use alternate hash functions rather than
the one Feathers uses in hashPassword.

a-l-m addresses both concerns.

#### Encryption is no longer performed internally
a-l-m does not encrypt the password internally.
The hooks on the user service must do so for all service calls, including those made by a-l-m.

#### Alternate hash function

You can use an alternate hash function, if you want to, by using another hashing hook.

You may want to do this if hashPassword function is too expensive in computation.
You can display the elapsed times for it, and some alternatives, by running misc/hash-timing-tests.js.
Results vary from run to run as hashPassword randomly varies the number of hash cycles to impede timing attacks.  

You will also have to pass a-l-m an option which compares a plain string to its encrypted value.
See bcryptjs##compare for information on such a function's signature.
The repo uses the callback version of that function. The default option is:
```js
const bcrypt = require('bcryptjs');

app.configure(authLocalMgnt({
  bcryptCompare: bcrypt.compare,
}));
```

However additional work is still needed for the authentication verifier.
```txt
daffl Nov. 08, 2018 [2:03 PM]
It’s an option now (https://github.com/feathersjs/feathers/blob/master/packages/authentication-local/lib/hooks/hash-password.js)

`hashPassword({ bcrypt: require('bcrypt') })`

Hasn’t been added to the verifier yet unfortunately so you have to extend it
and implement your own `_comparePassword` (https://docs.feathersjs.com/api/authentication/local.html#verifier)
```

### Authentication of calls to a-l-m

By default, unauthenticated users may continue to make these calls
- resendVerifySignup
- verifySignupLong
- verifySignupShort
- sendResetPwd
- resetPwdLong
- resetPwdShort

You can override this with options.actionsNoAuth whose default is
```js
actionsNoAuth: [
  'resendVerifySignup', 'verifySignupLong', 'verifySignupShort',
  'sendResetPwd', 'resetPwdLong', 'resetPwdShort',
],                                     
```

### Client may only affect their own account

Client calls for passwordChange and identityChange may now only affect their own account.
This can be controlled by options.ownAcctOnly whose default is true.

### isVerified

`user.isVerified` is no longer checked for calls made by the server.

### client convenience methods

The client convenient methods in feathers-authentication-management/src/client.js have been removed.
They were one line wrappers around service calls to the f-a-m service.
They created a conceptual burden for little in return.
People did not look at their code and ended up asking things like
how to use them with Redux, something they would have known how to do with the service call itself.

Each call to a convenience method can be replaced with a one line service call.

## Enhancements

### async/await

async/await is used throughout the repo. The repo interfaces may be called either with await,
or by using Promises. So the interfaces themselves are backwards compatible.

### Respects config/default.json and option.passwordField

The user-entity service name and the name of the password field in its records now defaults
config/default.json##authentication##local##entity and ##passwordField.
These can be overridden with the a-l-m options service and passwordField.

The signature of options.sanitizeUserForClient is now (user, passwordField) instead of (user).

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
 isVerified         Boolean             INTEGER
 verifyExpires      Date.now()          DATE (*)
 verifyChanges      Object              STRING, JSON.stringify
 resetExpires       Date.now()          DATE (*)
```

(*) The hook passes the 2 datetimes to the adapter as Date.now() when used as a before hook.
The adapter converts them to the DB format.
The hook itself converts the datetimes back to Date.now() when run as an after hook.

There are options to
- Customize the datetime conversion,
- Customize the verifyChanges conversion,
- Skip converting any of these fields.

The test/sequelize.test.js module uses the feathers-sequelize adapter with an sqlite3 table created with
```txt
authentication-local-management$ sqlite3 ./testdata/users.sqlite3
SQLite version 3.19.3 2017-06-08 14:26:16
Enter ".help" for usage hints.
sqlite> .schema
sqlite> CREATE TABLE 'Users' ('id' INTEGER PRIMARY KEY AUTOINCREMENT,
  'email'            VARCHAR( 60),
  'password'         VARCHAR( 60), 
  'phone'            VARCHAR( 30),
  'dialablePhone'    VARCHAR( 15),
  'preferredComm'    VARCHAR(  5),
  'isVerified'       INTEGER, 
  'verifyExpires'    DATETIME, 
  'verifyToken'      VARCHAR( 60),
  'verifyShortToken' VARCHAR(  8), 
  'verifyChanges'    VARCHAR(255), 
  'resetExpires'     INTEGER, 
  'resetToken'       VARCHAR( 60), 
  'resetShortToken'  VARCHAR(  8)
 );
sqlite> 
```

Module users.sequelize.js much be customized to reflect the changes conversionSql makes:

```js
// !code: moduleExports
{
  isVerified: {
    type: DataTypes.INTEGER,
  },
  verifyExpires: {
    type: DataTypes.DATE,
  },
  verifyChange: {
    type: DataTypes.STRING
  },
  resetExpires: {
    type: DataTypes.DATE
  },
}
// !end
```

### Customization of service calls

People inevitably find valid reasons for wanting to  customize the service calls being made by a repo.
A good example is provided in https://github.com/feathers-plus/feathers-authentication-management/issues/107
where the calls need to be customized to identify a set of calls for transaction roll back.

You can customize every call in the repo using the new options.customizeCalls.
It defaults to
```js
{
  checkUnique: {
    find: async (usersService, params = {}) =>
      await usersService.find(params),
  },
  identityChange: {
    find: async (usersService, params = {}) =>
      await usersService.find(params),
    patch: async (usersService, id, data, params = {}) =>
      await usersService.patch(id, data, params),
  },
  passwordChange: {
    find: async (usersService, params = {}) =>
      await usersService.find(params),
    patch: async (usersService, id, data, params = {}) =>
      await usersService.patch(id, data, params),
  },
  resendVerifySignup: {
    find: async (usersService, params = {}) =>
      await usersService.find(params),
    patch: async (usersService, id, data, params = {}) =>
      await usersService.patch(id, data, params),
  },
  resetPassword: {
    resetTokenGet: async (usersService, id, params) =>
      await usersService.get(id, params),
    resetShortTokenFind: async (usersService, params = {}) =>
      await usersService.find(params),
    badTokenpatch: async (usersService, id, data, params = {}) =>
      await usersService.patch(id, data, params),
    patch: async (usersService, id, data, params = {}) =>
      await usersService.patch(id, data, params),
  },
  sendResetPwd: {
    find: async (usersService, params = {}) =>
      await usersService.find(params),
    patch: async (usersService, id, data, params = {}) =>
      await usersService.patch(id, data, params),
  },
  verifySignup: {
    find: async (usersService, params = {}) =>
      await usersService.find(params),
    patch: async (usersService, id, data, params = {}) =>
      await usersService.patch(id, data, params),
  },
};
```

You can check the src/ modules for where these are called.

You can provide an options.customizeCalls object when initializing the a-l-m.
Your functions will be *merged* with the defaults, so you only need specify the ones which changed.

### Customization of errors

When a-l-m throws for any reason, option.catchErr is called. The default is

```js
  catchErr: (err, options, data) => {
    return Promise.reject(err); // support both async and Promise interfaces
  },
  ```
  
You can override this to return whatever error you want (by throwing) or returning whatever response you want to the client (by return {...}).

This handles issues such as https://github.com/feathers-plus/feathers-authentication-management/issues/85

### addVerification

It now works correctly when context.data is an array.

## Documentation

### configuring authentication-local-management

a-l-m is configured like this

??????????????????? todo

### cli+ JSON-schema for user-entity

If you are using the cli+ generator, the user entity's JSON-schema could be defined as
```js
  // Fields in the model.
  properties: {
    // !code: schema_properties
    /* eslint-disable */
    _id:              { type: 'ID' },
    email:            { type: 'string',  minLength:  8, maxLength: 40, faker: 'internet.email'           },
    password:         { type: 'string',  minLength:  4, maxLength: 30                                    },
    phone:            { type: 'string',  minLength:  7, maxLength: 30, faker: { 'phone.phoneNumber': '(###) ###-####' } },
    dialablePhone:    { type: 'string',  minLength:  7, maxLength: 15, faker: { 'phone.phoneNumber': '+1##########'     } },
    preferredComm:    { type: 'string',  enum: ['email', 'phone']                                        },
    isVerified:       { type: 'boolean' },
    verifyExpires:    { type: 'integer',                               faker: { exp: 'Date.now() +  5' } },
    verifyToken:      { type: 'string',  minLength: 30, maxLength: 30, faker: { exp: 'null'            } },
    verifyShortToken: { type: 'string',  minLength:  6, maxLength:  6, faker: { exp: 'null'            } },
    verifyChange:     { type: 'array',                                 faker: { exp: '[]'              } },
    resetExpires:     { type: 'integer',                               faker: { exp: 'Date.now() +  8' } },
    resetToken:       { type: 'string',  minLength: 30, maxLength: 30, faker: { exp: 'null'            } },
    resetShortToken:  { type: 'string',  minLength:  6, maxLength:  6, faker: { exp: 'null'            } },
    /* eslint-enable */
    // !end
  },
```

For Mongoose
```js
email:         { type: String  },
password:      { type: String  },
phone:         { type: String  },
dialablePhone: { type: String  },
preferredComm: { type: String, enum: ['email', 'phone'] },
isVerified:    { type: Boolean },
verifyToken:   { type: String  },
verifyExpires: { type: Date    },
verifyChanges: { type: Object  },
resetToken:    { type: String  },
resetExpires:  { type: Date    }
```

For Sequelize (duplicate)
The test/sequelize.test.js module uses the feathers-sequelize adapter with an sqlite3 table created with
```txt
$ sqlite3 ./testdata/users.sqlite3
SQLite version 3.19.3 2017-06-08 14:26:16
Enter ".help" for usage hints.
sqlite> .schema
sqlite> CREATE TABLE 'Users' ('id' INTEGER PRIMARY KEY AUTOINCREMENT,
  'email'            VARCHAR( 60),
  'password'         VARCHAR( 60), 
  'phone'            VARCHAR( 30),
  'dialablePhone'    VARCHAR( 15),
  'preferredComm'    VARCHAR(  5),
  'isVerified'       INTEGER, 
  'verifyExpires'    DATETIME, 
  'verifyToken'      VARCHAR( 60),
  'verifyShortToken' VARCHAR(  8), 
  'verifyChanges'    VARCHAR(255), 
  'resetExpires'     INTEGER, 
  'resetToken'       VARCHAR( 60), 
  'resetShortToken'  VARCHAR(  8)
);
sqlite> 
```



### Hooks for the user-entity

a-l-m externalizes some of the required processing into hooks.
This allows you to customize things like the hashing function.

The user-entity hooks would typically be configured as shown below.
Note the conversionSql hook is used only with user-entities using the Sequelize or Knex adapter.

```js
const { authenticate } = require('@feathersjs/authentication').hooks;
const { hashPassword, protect } = require('@feathersjs/authentication-local').hooks;
const { addVerification, conversionSql, isVerified } = 
  require('@feathers-plus/authentication-local-management').hooks;

let moduleExports = {
  before: {
    all: [
      // Convert isVerified, verifyExpires, verifyChanges, resetExpires to SQL format.
      conversionSql(),
    ],
    find: [
      authenticate('jwt'),
      // Check user has been verified i.e. isVerified === true.
      isVerified(),
    ],
    get: [ authenticate('jwt'), isVerified() ],
    create: [
      // Hash password, verifyToken, verifyShortToken, resetToken, resetShortToken. 
      hashPassword(),
      authenticate('jwt'), isVerified(), // may or may not want to have this depending on the app
      // Add fields required by authentication-local-management:
      // isVerified, verifyToken, verifyShortToken, verifyChanges,
      // resetExpires, resetToken & resetShortToken.
      addVerification(), 
    ],
    update: [ hashPassword(), authenticate('jwt'), isVerified() ],
    patch: [ hashPassword(), authenticate('jwt'), isVerified() ],
    remove: [ authenticate('jwt'), isVerified() ]
  },

  after: {
    all: [
      // Convert isVerified, verifyExpires, verifyChanges, resetExpires from SQL format.
      conversionSql(),
      protect('password') /* Must always be the last hook */ 
   ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },
};
```

The isVerified would no longer be needed once its merged into feathersjs/authentication-local.

### Hooks for services requiring authentication

Services available only to authenticated clients would be configured like

```js
const { authenticate } = require('@feathersjs/authentication').hooks;
const { isVerified } = require('@feathers-plus/authentication-local-management').hooks;

module.exports = {
  before: {
   all: [ authenticate('jwt'), isVerified() ],
   // ...
  },
};
```

The isVerified would no longer be needed once its merged into feathersjs/authentication-local.

### Configuring the client

This is an example of configuring the client, including authenticating the client
and configuring `authManagement`.
The `authManagement` service needs a timeout greater than 5 seconds as multiple values may be hashed.

```js
async function configClient(host, port, email1, password1,
  timeoutSocketio = 20000, timeoutAuthenticationClient = 20000, timeoutAuthLocalMgntClient = 20000
) {
  const socket = io(`http://${host}:${port}`, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    extraHeaders: {},
    timeout: timeoutSocketio,
  });
  client = feathersClient();

  client.configure(feathersClient.socketio(socket));
  client.configure(feathersClient.authentication({
    storage: localStorage,
    timeout:  timeoutAuthenticationClient,
  }));

  try {
    await client.authenticate({
      strategy: 'local',
      email: email1,
      password: password1,
    });
    console.log('    ... client authenticated');
  } catch (err) {
    console.log('    ... client could not authenticate.', err);
    throw new Error(`Unable to authenticate: ${err.message}`);
  }

  const authLocalMgntClient = client.service('authManagement');
  authLocalMgntClient.timeout = timeoutAuthLocalMgntClient; // 20000 !important

  return client;
}
```

And you can logout with

```js
client.logout();
```


## Things added

- ???? do we need a language field for i18n?

- WhatsApp as alternative to phone

- Have multiple passwords, e.g. pin number

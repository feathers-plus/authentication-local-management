# upgrading feathers-authentication-management (a.k.a. f-a-m) to authentication-local-management (a.k.a. a-l-m)

## Breaking changes

### Encryption of password and tokens

f-a-m internally encrypted the values for password, verifyToken, resetToken and resetShortToken.
The most common issue occurring in the repo was the app rehashing the password in the before hooks.
The app had to run hashPassword in the hooks only if the service had not been by the repo.

Related to this, some devs asked about the possibility to use alternate hash functions rather than
the one Feathers uses in hashPassword.
Perhaps that resulted in more of a performance drop than the dev were willing to accept.

a-l-m addresses both concerns.

#### Encryption is no longer performed internally
a-l-m does not encrypt the password nor any token internally.
The hooks on the user service must do so for all service calls, including those made by a-l-m.
a-l-m provides a convenience hook to do so.

```js
const { hashPasswordAndTokens } = require('@feathersjs/authentication-local-management').hooks;

app.service('users').hooks = {
  before: {
    create: hashPasswordAndTokens(),
    patch: hashPasswordAndTokens(),
  },
};

// hashPasswordAndTokens(password, verifyToken, resetToken, resetShortToken) is equivalent to
// [ hashPassword({ passwordField: password || 'password'}),
//   hashPassword({ passwordField: verifyToken || 'verifyToken' }),
//   hashPassword({ passwordField: resetToken || 'resetToken'}),
//   hashPassword({ passwordField: resetShortToken || 'resetShortToken'}),
// ]
```

So you would configure the hooks for the users service like this.

```js
{
  before: {
    //all: debug(),
    find: [ authenticate('jwt'), isVerified() ],
    get: [ authenticate('jwt'), isVerified() ],
    create: [ hashPasswordAndTokens(), isVerified(), addVerification() ],
    update: [  hashPassword(), authenticate('jwt'), isVerified() ],
    patch: [  hashPasswordAndTokens(), authenticate('jwt'), isVerified() ],
    remove: [ authenticate('jwt'), isVerified() ]
  },
  after: {
    all: protect('password'), /* Must always be the last hook */
  },
}
```

The isVerified would no longer be needed once its merged into feathersjs/authentication-local.

#### Alternate hash function

You can use an alternate hash function, if you want to, by using another hashing hook.

You may want to do this if hashPassword function is too expensive in computation.
You can the elapsed times for it, and some alternatives, by running misc/hash-timing-tests.js.
Results vary from run to run as hashPassword randomly varies the number of hash cycles to impede timing attacks.  

You would also have to pass a-l-m an option which compares a plain string to its encrypted value.
See bcryptjs##compare for information on such a function's signature.
The repo uses the callback version of that function. The default option is:
```js
const bcrypt = require('bcryptjs');

app.configure(authLocalMgnt({
  bcryptCompare: bcrypt.compare,
}));
```

Additional work is needed for the authentication verifier.
```txt
daffl Nov. 08, 2018 [2:03 PM]
It’s an option now (https://github.com/feathersjs/feathers/blob/master/packages/authentication-local/lib/hooks/hash-password.js)

`hashPassword({ bcrypt: require('bcrypt') })`

Hasn’t been added to the verifier yet unfortunately so you have to extend it
and implement your own `_comparePassword` (https://docs.feathersjs.com/api/authentication/local.html#verifier)
```

### Authentication of calls to a-l-m

Hooks are now automatically configured on the a-l-m service.
Unauthenticated users may continue to make these calls
- resendVerifySignup
- verifySignupLong
- verifySignupShort
- sendResetPwd
- resetPwdLong
- resetPwdShort

Now only authenticated users may make these calls
- checkUnique
- passwordChange
- identityChange

The default configuration is
```js
const { authenticate } = require('@feathersjs/authentication').hooks;

const actionsNoAuth = [
  'resendVerifySignup', 'verifySignupLong', 'verifySignupShort',
  'sendResetPwd', 'resetPwdLong', 'resetPwdShort'
];

module.exports = {
  before: {
    create: async context => {
      if (!context.data || !actionsNoAuth.includes(context.data.action)) {
         context = await authenticate('jwt')(context);
      }
 
      context.data.authUser = context.params.user;
      context.data.provider = context.params.provider;
      return context;
    }  
  }
};
```

You can override this with your own configuration using the authManagementHooks option.

### Client may only affect their own account

Client calls for password and identityChange may now only affect their own account.

This can be controlled by options.ownAcctOnly whose default is true.

### isVerified

Does not check isVerified for calls made by the server.

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
sqlite> CREATE TABLE 'Users' ('id' INTEGER PRIMARY KEY AUTOINCREMENT, 'email' VARCHAR(60), 'password' VARCHAR(60), 'isVerified' INTEGER, 'verifyExpires' DATETIME, 'verifyToken' VARCHAR(60), 'verifyShortToken' VARCHAR(8), 'verifyChanges' VARCHAR(255), 'resetExpires' INTEGER, 'resetToken' VARCHAR(60), 'resetShortToken' VARCHAR(8));
sqlite> 
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

### Hooks for the user-entity

a-l-m externalizes some of the required processing into hooks.
This allows you to customize things like the hashing function.

The user-entity hooks would typically be configured as shown below.
Note the conversionSql hook is used only with user-entities using the Sequelize or Knex adapter.

```js
const { authenticate } = require('@feathersjs/authentication').hooks;
const { hashPassword, protect } = require('@feathersjs/authentication-local').hooks;
const { addVerification, conversionSql, hashPasswordAndTokens, isVerified, removeVerification } = 
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
    get: [
      authenticate('jwt'),
      // Check user has been verified i.e. isVerified === true.
      isVerified(),
    ],
    create: [
      // Hash password, verifyToken, verifyShortToken, resetToken, resetShortToken. 
      hashPasswordAndTokens(),
      // Check user has been verified i.e. isVerified === true.
      isVerified(),
      // Add fields required by authentication-local-management:
      // isVerified, verifyToken, verifyShortToken, verifyChanges,
      // resetExpires, resetToken & resetShortToken.
      addVerification(), 
    ],
    update: [
      hashPassword(),
      authenticate('jwt'),
      // Check user has been verified i.e. isVerified === true.
      isVerified(),
    ],
    patch: [
      // Hash password, verifyToken, verifyShortToken, resetToken, resetShortToken.
      hashPasswordAndTokens(),
      authenticate('jwt'),
      // Check user has been verified i.e. isVerified === true.
      isVerified(),
    ],
    remove: [
      authenticate('jwt'),
      // Check user has been verified i.e. isVerified === true.
      isVerified(),
    ]
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
  authLocalMgntClient.timeout = timeoutAuthLocalMgntClient; // 20000

  return client;
}
```

And you can logout with

```
client.logout();
server.close();
setTimeout(() => done(), delayAfterServerClose);
```

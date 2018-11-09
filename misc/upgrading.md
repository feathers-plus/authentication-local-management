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

(a) First a-l-m does not encrypt the password nor any token internally.
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

(b) You can use an alternate hash function, if you want to, by using another hashing hook.

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

## Enhancements

### Respects config/default.json and option.passwordField

The user-entity service name and the name of the password field in its records now defaults
config/default.json##authentication##local##entity and ##passwordField.
These can be overridden with the a-l-m options service and passwordField.

The signature of options.sanitizeUserForClient is now (user, passwordField) instead of (user).

### Coerce fields for Sequelize and Knex

The second most common issue raised with f-a-m was how to use it with Sequelize/Knex.
f-a-m expected the user-entity model to be in a JS-friendly format,
and the dev was expected to use hooks to reformat that to the Sequelize/Knex model.

The conversionSql hook has been introduced. Its used on the user-entity as follows:
```js
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
 verifyExpires      Date.now()          BIGINT 
 verifyChanges      Object              STRING, JSON.stringify
 resetExpires       Date.now()          BIGINT
```

There are options to
- Customize the datetime conversion,
- Customize the verifyChanges conversion,
- Skip converting any of these fields.

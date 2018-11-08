# upgrading feathers-authentication-management (a.k.a. f-a-m) to authentication-local-management (a.k.a. a-l-m)

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

(b) You can use alternate hash functions if you want to.

You would also have to pass a-l-m an option which compares a plain string to its encrypted value.
See bcryptjs##compare for information of the function's signature.
The repo uses the callback version of that function.
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

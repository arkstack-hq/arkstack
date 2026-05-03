# Authentication

Arkstack provides authentication through `@arkstack/auth` and framework-specific middleware in the runtime drivers.

The auth package owns the framework-neutral session logic. Express and H3 integrations live in their driver packages so each runtime can attach authenticated state in the shape developers expect.

## Install

Full templates include the auth-ready model structure. If you are adding auth manually, install the shared auth and HTTP packages plus your runtime driver:

```sh
pnpm add @arkstack/auth @arkstack/http
```

Set a JWT secret in `.env`:

```env
JWT_SECRET="replace-this-with-a-long-random-secret"
JWT_EXPIRES_IN="1h"
```

## Models

Auth resolves application models through `getModel()`, so your app must provide `User` and `PersonalAccessToken` models in the configured model path.

By default, Arkstack looks in `src/app/models`.

```ts
// src/app/models/User.ts
import { User as BaseUser } from '@arkstack/auth';

export default class User extends BaseUser {
  protected static table = 'users';
}
```

```ts
// src/app/models/PersonalAccessToken.ts
import { PersonalAccessToken as BasePersonalAccessToken } from '@arkstack/auth';

export default class PersonalAccessToken extends BasePersonalAccessToken {
  protected static table = 'personal_access_tokens';
  protected static columns = {
    userId: 'user_id',
    deviceInfo: 'device_info',
    lastUsedAt: 'last_used_at',
    expiresAt: 'expires_at',
  };
}
```

## Login

Use `Auth` to verify credentials and create a personal access token.

```ts
import { Auth } from '@arkstack/auth';

const auth = Auth.make();
const personalAccessToken = await auth.login(email, password);

return {
  token: personalAccessToken.token,
  user: personalAccessToken.user,
};
```

`Auth.login()` validates the user password with Arkstack's hash utility, creates a JWT with `jose`, stores it as a personal access token, and associates the token with the current device when request information is available.

## Protect Express Routes

Use the Express driver middleware when working in an Express app:

```ts
import { auth, type AuthenticatedExpressRequest } from '@arkstack/driver-express/middlewares';

app.use('/account', auth, (req, res) => {
  const request = req as AuthenticatedExpressRequest;

  res.json({
    user: request.authUser,
  });
});
```

Send the token as a bearer token:

```http
Authorization: Bearer <token>
```

The middleware attaches:

- `req.user`
- `req.authUser`
- `req.authToken`

## Protect H3 Routes

Use the H3 driver middleware when working in an H3 app:

```ts
import { H3 } from 'h3';
import { auth, type AuthenticatedH3Context } from '@arkstack/driver-h3/middlewares';

const app = new H3();

app.use(auth);
app.use('/account', (event) => {
  const context = event.context as AuthenticatedH3Context;

  return {
    user: context.authUser,
  };
});
```

The middleware attaches:

- `event.context.user`
- `event.context.authUser`
- `event.context.authToken`

## Current Session

Use `currentSession()` when you need the database record for the current bearer token:

```ts
const session = await Auth.make()
  .setRequest(req)
  .currentSession()
  .token();
```

This is useful for showing device/session metadata or revoking the current token.

## Temporary Tokens

Temporary tokens are useful for flows like two-factor authentication:

```ts
const token = await Auth.make().createTemporaryToken(user, 'two-factor', '10m');
const verifiedUser = await Auth.make().authorizeTemporaryToken(token, 'two-factor');
```

Temporary tokens are JWTs and are not stored as personal access tokens.


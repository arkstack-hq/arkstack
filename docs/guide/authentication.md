# Authentication

Arkstack provides authentication through `@arkstack/auth` and framework-specific middleware in the runtime drivers.

The auth package owns the framework-neutral session logic. All integrations live in their driver packages so each runtime can attach authenticated state in the shape developers expect.

## Install

Full templates include the auth-ready model structure. If you are adding auth manually, install the shared auth and HTTP packages plus your runtime driver:

::: code-group

```sh [npm]
npm i @arkstack/auth @arkstack/http
```

```sh [pnpm]
pnpm add @arkstack/auth @arkstack/http
```

```sh [yarn]
yarn add @arkstack/auth @arkstack/http
```

:::

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
import PersonalAccessToken from './PersonalAccessToken';

export default class User extends BaseUser {
  declare email: string;
  declare password: string;
  declare name: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  protected static columns = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };

  personalAccessTokens() {
    return this.hasMany(PersonalAccessToken, 'userId');
  }
}
```

```ts
// src/app/models/PersonalAccessToken.ts
import { PersonalAccessToken as BasePersonalAccessToken } from '@arkstack/auth';
import User from './User';

export default class PersonalAccessToken extends BasePersonalAccessToken {
  declare name: string;
  declare token: string;
  declare abilities: string[];
  declare deviceInfo: Record<string, unknown>;
  declare lastUsedAt: Date;
  declare expiresAt: Date;
  declare createdAt: Date;
  declare updatedAt: Date;

  protected static columns = {
    userId: 'user_id',
    deviceInfo: 'device_info',
    lastUsedAt: 'last_used_at',
    expiresAt: 'expires_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };

  user() {
    return this.belongsTo(User, 'userId');
  }
}
```

## Login Route

Use `Auth` inside a Clear Router route to verify credentials and create a personal access token.

```ts
import { Auth } from '@arkstack/auth';
import { Router } from 'src/core/router';

Router.post('/auth/login', async ({ req, res }) => {
  const { email, password } = req.body;
  const auth = Auth.make().setRequest(req);
  const personalAccessToken = await auth.login(email, password);

  return res.status(200).json({
    token: personalAccessToken.token,
    user: personalAccessToken.user,
  });
});
```

`Auth.login()` validates the user password with Arkstack's hash utility, creates a JWT with `jose`, stores it as a personal access token, and associates the token with the current device when request information is available.

## Protect Routes

Clear Router accepts middleware as the final argument on a route. Use the auth middleware from your active driver package and attach it to any protected route.

```ts
import { auth } from '@arkstack/driver-express/middlewares';
import { Router } from 'src/core/router';

Router.get(
  '/account',
  ({ req, res }) => {
    return res.status(200).json({
      user: req.authUser,
    });
  },
  [auth],
);
```

For other runtimes, import `auth` from `@arkstack/driver-[framework]/middlewares`. The middleware placement in the Clear Router route stays the same.

Send the token as a bearer token:

```http
Authorization: Bearer <token>
```

## Protect Route Groups

Use a Clear Router group when several routes share the same auth gate:

```ts
import { auth } from '@arkstack/driver-express/middlewares';
import { Auth } from '@arkstack/auth';
import { Router } from 'src/core/router';

await Router.group(
  '/account',
  async () => {
    Router.get('/profile', ({ req, res }) => {
      return res.status(200).json({
        user: req.authUser,
      });
    });

    Router.get('/sessions', async ({ req, res }) => {
      const session = await Auth.make()
        .setRequest(req)
        .currentSession()
        .token();

      return res.status(200).json({
        session,
      });
    });
  },
  [auth],
);
```

## Authenticated Context

After auth middleware runs, the selected runtime driver attaches authenticated state to the request context used by Clear Router.

In route handlers, use:

- `authUser` for the authenticated user.
- `authToken` for the bearer token string.

For most application code, prefer using those values from the Clear Router handler context instead of reaching into the underlying framework application directly.

## Current Session Route

Use `currentSession()` when you need the database record for the current bearer token:

```ts
import { Auth } from '@arkstack/auth';
import { auth } from '@arkstack/driver-express/middlewares';
import { Router } from 'src/core/router';

Router.get(
  '/account/session',
  async ({ req, res }) => {
    const session = await Auth.make().setRequest(req).currentSession().token();

    return res.status(200).json({
      session,
    });
  },
  [auth],
);
```

This is useful for showing device/session metadata or revoking the current token.

## Temporary Tokens

Temporary tokens are useful for flows like two-factor authentication:

```ts
const token = await Auth.make().createTemporaryToken(user, 'two-factor', '10m');
const verifiedUser = await Auth.make().authorizeTemporaryToken(
  token,
  'two-factor',
);
```

Temporary tokens are JWTs and are not stored as personal access tokens.

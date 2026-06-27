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

Set the application key in `.env`. `APP_KEY` is the unified secret used to sign JWTs and encrypt values (exposed as `config('app.key')`):

```txt
APP_KEY="a-long-random-secret"
JWT_EXPIRES_IN="1h"
```

Generate one automatically with:

```sh
ark key:generate
```

> Backward compatibility: if `APP_KEY` is not set, a legacy `JWT_SECRET` is still used when present.

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
import { Router } from '@arkstack/driver-express';

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
import { Router } from '@arkstack/driver-express';

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

## Auth Middleware Hooks

The auth middleware exposes a runtime-agnostic `middleware:auth` hook through `Hook` from `@arkstack/foundry`. Register hooks during application boot (preferable in `src/core/bootstrap.ts`) so they are available before protected routes run.

The hook contract is the same across runtime drivers: middleware context is passed as `{ req, res }`, and error hooks receive the error first.

```ts
import { Hook } from '@arkstack/foundry';

Hook.set('middleware:auth', {
  before: ({ req, res }) => {
    console.log('auth middleware starting');
  },
  after: ({ req, res }) => {
    console.log('auth middleware passed', {
      userId: req.authUser?.id,
    });
  },
  error: (error, { req, res }) => {
    console.error('auth middleware failed', { error });
  },
});
```

Hook positions receive:

- `before({ req, res })` before the bearer token is read.
- `after({ req, res })` after the token is authorized and `req.user`, `req.authUser`, and `req.authToken` are attached.
- `error(error, { req, res })` when authentication throws before the error is passed back to the active runtime.

Calling `Hook.set('middleware:auth', ...)` again merges the supplied positions with existing ones, so packages can add an `error` hook without replacing an existing `before` hook.

## Protect Route Groups

Use a Clear Router group when several routes share the same auth gate:

```ts
import { auth } from '@arkstack/driver-express/middlewares';
import { Auth } from '@arkstack/auth';
import { Router } from '@arkstack/driver-express';

await Router.group(
  '/account',
  async () => {
    Router.get('/profile', ({ req, res }) => {
      return res.status(200).json({
        user: req.authUser,
      });
    });

    Router.get('/sessions', async ({ req, res }) => {
      const session = await Auth.make().setRequest(req).session().token();

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

Use `session()` when you need the database record for the current bearer token:

```ts
import { Auth } from '@arkstack/auth';
import { auth } from '@arkstack/driver-express/middlewares';
import { Router } from '@arkstack/driver-express';

Router.get(
  '/account/session',
  async ({ req, res }) => {
    const session = await Auth.make().setRequest(req).session().token();

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

## Two-Factor Authentication

Arkstack supports authenticator app and SMS two-factor flows through `TwoFactor`.

Apps that persist two-factor state should provide a `UserTwoFactor` model backed by a `user_two_factors` table. Full templates include the model and migration; otherwise publish them from `@arkstack/auth`:

```sh
pnpm ark publish --tag two-factor
pnpm ark migrate
```

Authenticator secrets are encrypted with the application key (`APP_KEY`), so make sure it is set before storing them.

```txt
APP_KEY="a-long-random-secret"
TWO_FACTOR_SMS_TTL_MINUTES="10"
```

### Authenticator Apps

Create a setup secret, show the returned `otpauthUrl` as a QR code, then persist the secret after the user confirms a valid code.

```ts
import { TwoFactor } from '@arkstack/auth';

const setup = TwoFactor.createSetup(user);

await TwoFactor.setSecret(user.id, setup.secret);

if (TwoFactor.verifyCode(user, setup.secret, code)) {
  const recoveryCodes = TwoFactor.generateBackupCodes();

  await TwoFactor.setMethod(user.id, 'authenticator');
  await TwoFactor.setEnabledAt(user.id);
  await TwoFactor.writeRecoveryCodeHashes(
    user.id,
    await TwoFactor.hashBackupCodes(recoveryCodes),
  );
}
```

### SMS Codes

`TwoFactor.issueSmsCode()` creates and stores a hashed challenge. Deliver the returned code with `@arkstack/notifications`.

```ts
import { TwoFactor } from '@arkstack/auth';
import { Notification } from '@arkstack/notifications';

const issued = await TwoFactor.issueSmsCode(user, 'login');

await Notification.sms()
  .recipient(user.phone)
  .send('Your {app} login code is {code}.', undefined, undefined, {
    app: 'Arkstack',
    code: issued.code,
  });
```

Configure the SMS transport in `src/config/notifications.ts`:

```ts
import { env } from '@arkstack/common';

export default () => ({
  default_driver: 'mail',
  drivers: {
    sms: {
      transport: 'africastalking',
      from: 'Arkstack',
    },
  },
  transports: {
    africastalking: {
      username: env('AFRICASTALKING_USERNAME', 'sandbox'),
      apiKey: env('AFRICASTALKING_API_KEY'),
      senderId: env('AFRICASTALKING_SENDER_ID'),
    },
    twilio: {
      accountSid: env('TWILIO_ACCOUNT_SID'),
      authToken: env('TWILIO_AUTH_TOKEN'),
      from: env('TWILIO_FROM'),
    },
  },
});
```

`drivers.sms.transport` selects the provider transport. Use `SMS_TRANSPORT=twilio` or `SMS_TRANSPORT=africastalking` in template config if you want to choose it from the environment.

Verify and consume the code:

```ts
const verified = await TwoFactor.verifySmsCode(user.id, code, 'login');

if (!verified) {
  throw new Error('Invalid or expired two-factor code');
}
```

Recovery codes can be generated for either two-factor method:

```ts
const recoveryCodes = TwoFactor.generateBackupCodes();

await TwoFactor.writeRecoveryCodeHashes(
  user.id,
  await TwoFactor.hashBackupCodes(recoveryCodes),
);

const consumed = await TwoFactor.consumeRecoveryCode(user.id, recoveryCode);
```

# @arkstack/auth

Authentication package for Arkstack applications.

`@arkstack/auth` provides the framework-neutral auth service used by Arkstack runtime drivers. It supports credential verification, JWT-backed personal access tokens, temporary purpose-bound tokens, current-session lookup, two-factor authentication helpers, and auth-specific exceptions.

## Usage

```ts
import { Auth } from '@arkstack/auth';

const auth = Auth.make();
const token = await auth.login(email, password);
const user = await auth.authorizeToken(token.token);
```

Auth resolves your app's `User` and `PersonalAccessToken` models with `getModel()` from `@arkstack/common`.

## Two-Factor Authentication

```ts
import { TwoFactor } from '@arkstack/auth';

const setup = TwoFactor.createSetup(user);
await TwoFactor.setSecret(user.id, setup.secret);

if (TwoFactor.verifyCode(user, setup.secret, code)) {
  const recoveryCodes = TwoFactor.generateBackupCodes();

  await TwoFactor.setMethod(user.id, 'authenticator');
  await TwoFactor.setEnabledAt(user.id);
  await TwoFactor.writeRecoveryCodeHashes(user.id, await TwoFactor.hashBackupCodes(recoveryCodes));
}
```

Apps that use persisted 2FA state should provide a `UserTwoFactor` model backed by a `user_two_factors` table. Starter templates include this model and migration. Set `TWO_FACTOR_ENCRYPTION_KEY` before storing authenticator secrets.

SMS 2FA is delivery-agnostic:

```ts
const issued = await TwoFactor.issueSmsCode(user, 'login');
await sms.send(user.phone, `Your login code is ${issued.code}`);
```

Driver middleware lives in the runtime packages:

```ts
import { auth } from '@arkstack/driver-express/middlewares';
import { auth as h3Auth } from '@arkstack/driver-h3/middlewares';
```

See the documentation Authentication guide for the full setup.

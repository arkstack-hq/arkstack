# @arkstack/auth

Authentication package for Arkstack applications.

`@arkstack/auth` provides the framework-neutral auth service used by Arkstack runtime drivers. It supports credential verification, JWT-backed personal access tokens, temporary purpose-bound tokens, current-session lookup, and auth-specific exceptions.

## Usage

```ts
import { Auth } from '@arkstack/auth';

const auth = Auth.make();
const token = await auth.login(email, password);
const user = await auth.authorizeToken(token.token);
```

Auth resolves your app's `User` and `PersonalAccessToken` models with `getModel()` from `@arkstack/common`.

Driver middleware lives in the runtime packages:

```ts
import { auth } from '@arkstack/driver-express/middlewares';
import { auth as h3Auth } from '@arkstack/driver-h3/middlewares';
```

See the documentation Authentication guide for the full setup.

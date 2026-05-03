# @arkstack/driver-h3

H3 driver package for Arkstack providing H3-specific implementations of core Arkstack features such as routing, middleware, and database integration.

## Auth Middleware

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

The middleware expects `Authorization: Bearer <token>` and attaches `user`, `authUser`, and `authToken` to `event.context`.

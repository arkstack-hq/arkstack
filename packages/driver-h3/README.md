# @arkstack/driver-h3

H3 driver package for Arkstack providing H3-specific implementations of core Arkstack features such as routing, middleware, and database integration.

## Auth Middleware

```ts
import { H3 } from 'h3';
import { auth } from '@arkstack/driver-h3/middlewares';

const app = new H3();

app.use(auth);
app.use('/account', ({ req }) => {
  return {
    user: req.authUser,
  };
});
```

The middleware expects `Authorization: Bearer <token>` and attaches `user`, `authUser`, and `authToken` to `event.context` and `event.req`.

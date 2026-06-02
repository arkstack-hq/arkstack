# @arkstack/driver-h3

[![@arkstack/driver-h3](https://img.shields.io/npm/dt/@arkstack/driver-h3?style=flat-square&label=@arkstack/driver-h3&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/driver-h3)](https://www.npmjs.com/package/@arkstack/driver-h3)

H3 driver for Arkstack, providing H3-based runtime integration for the framework.

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

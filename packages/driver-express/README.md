# @arkstack/driver-express

Express driver for Arkstack, providing Express-based runtime integration for the framework.

## Auth Middleware

```ts
import { auth } from '@arkstack/driver-express/middlewares';

app.use('/account', auth, (req, res) => {
  const request = req;

  res.json({
    user: request.authUser,
  });
});
```

The middleware expects `Authorization: Bearer <token>` and attaches `user`, `authUser`, and `authToken` to the request.

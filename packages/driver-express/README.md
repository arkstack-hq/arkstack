# @arkstack/driver-express

Express driver package for Arkstack, providing Express-specific implementations of core Arkstack features such as routing, middleware, and database integration.

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

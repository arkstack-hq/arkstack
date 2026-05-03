# @arkstack/http

Framework-neutral HTTP request and response wrappers for Arkstack shared packages.

Use this package when code needs request data but should not import Express, H3, or another runtime directly.

```ts
import { Request, Response } from '@arkstack/http';

const request = Request.from({
  headers: {
    authorization: 'Bearer token',
  },
  method: 'GET',
  path: '/account',
});

const token = request.bearerToken();

const response = new Response().status(200).json({ ok: true });
```

Runtime-specific handlers should continue to use their native framework request and response objects. Driver middleware can translate those objects into `@arkstack/http` wrappers when calling shared services.

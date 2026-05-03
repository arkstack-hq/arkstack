# HTTP

`@arkstack/http` provides small framework-neutral request and response wrappers used by shared packages such as `@arkstack/auth`.

Runtime drivers still expose their native framework objects. The HTTP package is for shared code that should work with Express, H3, tests, or custom drivers without importing framework-specific request and response types.

## Request

Create a normalized request from a native request-like object:

```ts
import { Request } from '@arkstack/http';

const request = Request.from({
  headers: {
    authorization: 'Bearer token',
  },
  method: 'GET',
  path: '/account',
  url: 'https://example.test/account',
});

request.header('authorization');
request.bearerToken();
```

Requests can also carry the authenticated user:

```ts
request.setUser(user);

const user = request.user;
```

## Response

Use `Response` when shared code needs a consistent response shape:

```ts
import { Response } from '@arkstack/http';

const response = new Response({
  statusCode: 200,
  headers: {
    'content-type': 'application/json',
  },
});

response.status(201);
response.json({ ok: true });
```

## When To Use It

Use `@arkstack/http` inside shared packages, reusable services, and tests.

Use native Express or H3 request objects in framework-specific route handlers and middleware. Driver middleware can translate native objects into normalized requests when it calls shared packages.

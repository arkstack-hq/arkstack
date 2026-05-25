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

## Session

The HTTP package includes a small request session container for framework-neutral route handlers. Import the setup entry once during application boot so Clear Router can attach the session to each HTTP context:

```ts
import '@arkstack/http/setup';
```

Inside a Clear Router handler, the context receives `session`, `httpSession`, and `errors`:

```ts
Router.post('/profile', async ({ session }) => {
  session.put('intended', '/dashboard');
  session.addError('email', 'Email is required');

  return { ok: false };
});
```

Use `httpSession` when another package already owns a `session` property on the context. Arkstack preserves existing non-HTTP sessions and exposes its own container as `httpSession`.

The session API supports the following common bag methods:

```ts
session.get('intended');
session.put('notice', 'Saved');
session.has('notice');
session.forget('notice');
session.clear();

session.addError('email', 'Email is required');
session.addErrors({ password: ['Password is too short'] });
session.hasErrors('email');
session.clearErrors('email');
```

### Session Persistence

Sessions are persisted with a signed device cookie. Each browser or device receives its own opaque session id, so session data is isolated per device.

By default, `@arkstack/http/setup` uses `CookieSessionDriver`. `config/session.ts` defaults to the file driver so only the signed id is stored in the browser and session payloads stay server-side.

```ts
// src/config/session.ts
export default config = () => ({
  driver: env('SESSION_DRIVER', 'file'),
  cookie: env('SESSION_COOKIE', 'arkstack_session'),
  secret: env('SESSION_SECRET', env('APP_KEY', 'change-me')),
  ttl: env<number>('SESSION_LIFETIME', 60 * 60 * 24 * 7),
  file: {
    directory: env('SESSION_FILE_PATH', 'storage/framework/sessions'),
  },
  database: {
    table: env('SESSION_TABLE', 'sessions'),
  },
});
```

Available drivers:

- `CookieSessionDriver` stores the session payload in the signed cookie. Use it for small, low-sensitivity sessions.
- `FileSessionDriver` stores payloads on disk and keeps only the signed session id in the cookie.
- `DatabaseSessionDriver` stores payloads in a database table and keeps only the signed session id in the cookie. Full templates include a `sessions` migration for this driver.

You can also configure sessions programmatically:

```ts
import { FileSessionDriver, configureSession } from '@arkstack/http';

configureSession(
  new FileSessionDriver({
    directory: 'storage/framework/sessions',
    secret: process.env.SESSION_SECRET,
  }),
);
```

Session mutations are persisted automatically. You may call `await session.save()` when a test or custom integration needs to wait for the write explicitly.

### Validation Errors

Arkstack uses Kanun for validation. Importing `@arkstack/http/setup` registers the Kanun session plugin, so failed validators automatically fill the current HTTP session error bag. You can still pass a Kanun validator message bag, a Kanun validation exception, or a plain keyed error object into the session manually when needed:

```ts
import { Validator, ValidationException } from 'kanun';

const validator = Validator.make(body, {
  email: 'required|email',
});

if (await validator.fails()) {
  // The Kanun session plugin has already copied validator.errors()
  // into the current request session.
  return await view('profile.edit');
}

try {
  await validator.validate();
} catch (error) {
  if (error instanceof ValidationException) {
    session.addValidationErrors(error);
  }
}
```

The error bag is available as `session.errors` and as `errors` on the HTTP context. It supports helpers such as `first`, `get`, `has`, `hasAny`, `missing`, `all`, `keys`, `count`, `toArray`, and `getMessages`.

When `@arkstack/view/setup` is also imported, the current session and error bag are available to Edge views rendered during the request.

## When To Use It

Use `@arkstack/http` inside shared packages, reusable services, and tests.

Use native Express or H3 request objects in framework-specific route handlers and middleware. Driver middleware can translate native objects into normalized requests when it calls shared packages.

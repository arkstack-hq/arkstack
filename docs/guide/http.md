# HTTP

`@arkstack/http` provides framework-neutral request and response wrappers used by shared packages such as `@arkstack/auth`.

The Express and H3 drivers automatically bind these wrappers to each Clear Router request. Runtime drivers still expose their native framework objects, so application code can choose the unified Arkstack objects or the underlying Express and H3 APIs.

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

## Route Context

Every route context receives one Arkstack request and response instance for the lifetime of that request:

```ts
Router.put('/api/users/:id', ({ clearRequest, clearResponse }) => {
  const id = clearRequest.param('id');

  return clearResponse.status(200).json({ id });
});
```

`clearRequest` and `clearResponse` are the unified Arkstack HTTP objects. Native objects remain available alongside them: Express handlers receive `req` and `res`, while H3 handlers retain the native H3 request and event context.

## Controller Injection

Arkstack enables Clear Router's container, decorator metadata, and automatic discovery during normal application boot. Decorate a controller method with `@Bind()` to resolve its typed arguments from the current request scope:

```ts
import { Request, Response, Session } from '@arkstack/http';
import { Bind } from 'clear-router/decorators';

export default class ProfileController {
  @Bind()
  async show(request: Request, response: Response, session: Session) {
    session.put('profile', request.param('id'));

    return response.status(200).json({ id: request.param('id') });
  }
}
```

Register decorated controller methods with the regular controller tuple syntax:

```ts
Router.get('/profiles/:id', [ProfileController, 'show']);
```

Repeated resolution of `Request`, `Response`, or `Session` within one route returns the same instance. Each concurrent request receives its own instances.

Applications using Clear Router outside the Arkstack drivers can install the integration manually with `await Router.use(arkstackHttpPlugin)` from `@arkstack/http`.

## Global Helpers

The global helpers resolve against the active request scope:

```ts
request();          // current Request
request('email');   // one input value
response();         // current Response
session();          // current Session
session('notice');  // one session value
```

The helpers are safe across concurrent routed requests. Resolve them where they are used rather than storing a request-scoped value for later reuse.

## Session

The HTTP package includes a request session container for framework-neutral route handlers. Arkstack starters import the setup entry during application boot. Custom bootstraps should import it once so sessions, validation integration, and decorator support are initialized:

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
export default () => ({
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

### Flash Data

Use the session flash bag for data that should survive exactly one following request. Flashed values are available through `session.flashBag` and are swept by the `web` middleware before the response completes:

```ts
session.flash('notice', 'Profile saved');
session.getFlash('notice');
```

The error bag extends the same flash behavior, so validation errors survive a redirect and are cleared after the response that consumes them.

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

For browser form routes, add the `web` middleware. Validation errors on those routes redirect back to the source route and flash the errors into the session. During the submitted request, `old()` reads directly from the current request input:

```ts
import { old, redirect, web } from '@arkstack/http';

Router.post('/register', async ({ req }) => {
  await validator.validate();

  return redirect('/dashboard');
}, [web]);

old(); // all submitted form data from the current request
old('email'); // one field from the current request input
```

When `@arkstack/view/setup` is also imported, the current session and error bag are available to Edge views rendered during the request.

## When To Use It

Use `@arkstack/http` in controllers, shared packages, reusable services, and tests that should work across runtimes.

Use native Express or H3 objects when a route handler or middleware needs a framework-specific API. Both object sets are available in the same route context, so native middleware can hand work to services built against the unified Arkstack request and response types.

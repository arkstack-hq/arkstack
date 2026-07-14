# Express Runtime Interaction

Arkstack's Express runtime integration provides multiple ways to interact with the underlying Express instance, allowing for flexible middleware application, route handling, and lifecycle control.

## Bootstrap Exports

From `src/core/bootstrap.ts`:

- `expressApp`: raw Express instance
- `app`: Arkstack `Application` instance

```ts
import { app, expressApp } from 'src/core/bootstrap';
```

## Interaction Options

### 1. Raw runtime: `expressApp`

Use this for direct Express APIs.

```ts
import { expressApp } from 'src/core/bootstrap';

expressApp.set('trust proxy', 1);
expressApp.disable('x-powered-by');
expressApp.locals.serviceName = 'api';
```

### 2. Instance runtime accessor: `app.getAppInstance()`

Get the runtime instance from the Arkstack wrapper.

```ts
import { app } from 'src/core/bootstrap';

const runtime = app.getAppInstance();
runtime.use((req, _res, next) => {
  req.headers['x-runtime'] = 'express';
  next();
});
```

### 3. Static runtime accessor: `Application.getAppInstance()`

Access the static runtime reference.

```ts
import Application from 'src/core/app';

const runtime = Application.getAppInstance();
runtime.set('etag', false);
```

### 4. Driver interaction: `app.getDriver()`

Use the runtime driver for lifecycle-level integration.

```ts
import { app } from 'src/core/bootstrap';

const driver = app.getDriver();
const runtime = app.getAppInstance();
await driver.applyMiddleware(runtime, (req, _res, next) => next());
```

### 5. Router contract interaction: `app.getRouter()`

Use the runtime-agnostic router contract.

```ts
import { app } from 'src/core/bootstrap';

const router = app.getRouter();
await router.bind(app.getAppInstance());

const routes = await router.list({ path: '/api' });
console.log(routes);
```

### 6. Lifecycle control: `boot` and `shutdown`

```ts
import { app } from 'src/core/bootstrap';

await app.boot(3000);
// later
await app.shutdown();
```

## Unified HTTP Context

The Express driver automatically installs `arkstackHttpPlugin`. Clear Router handlers receive the native Express `req` and `res` objects together with request-scoped Arkstack `clearRequest` and `clearResponse` objects:

```ts
Router.get('/account', ({ req, res, clearRequest, clearResponse }) => {
  const token = clearRequest.bearerToken();

  return clearResponse.status(200).json({
    ip: req.ip,
    token,
    headersSent: res.headersSent,
  });
});
```

Controllers decorated with `@Bind()` can inject `Request`, `Response`, and `Session` from `@arkstack/http`. The injected values are the same instances exposed on the route context and by the global HTTP helpers. See the [HTTP guide](/guide/http#controller-injection).

## Static Assets

Express mounts the `public` directory automatically during `app.boot(port)` through the runtime driver.

Default behavior:

- serves files from `path.join(Arkstack.rootDir(), 'public')`
- applies `Cache-Control: public, max-age=31536000, immutable`
- adds permissive CORS headers for static responses

If you need different static asset behavior, override `mountPublicAssets` in `src/core/app.ts` when constructing `ExpressDriver`.

```ts
import express from 'express';
import path from 'path';
import { ExpressDriver } from '@arkstack/driver-express';

this.driver = new ExpressDriver({
  bindRouter: async (runtime) => {
    runtime.use(await Router.bind());
  },
  mountPublicAssets: (runtime, publicPath) => {
    runtime.use(
      '/assets',
      express.static(path.resolve(publicPath), {
        maxAge: '7d',
      }),
    );
  },
  errorHandler: ErrorHandler,
});
```

## Host & Port Binding

The server resolves its listening port and host from environment variables, which makes it portable across hosting platforms (Railway, Heroku, Render, etc.).

| Variable               | Default   | Purpose                                                         |
| ---------------------- | --------- | --------------------------------------------------------------- |
| `PORT`                 | —         | Platform-provided port. Preferred over `APP_PORT` when present. |
| `APP_PORT`             | `3000`    | Application port used when `PORT` is not set.                   |
| `APP_HOST` (or `HOST`) | `0.0.0.0` | Host the server binds to.                                       |

Port resolution order is `PORT` → `APP_PORT` → `3000`. Platforms such as Railway inject a `PORT` variable at runtime, so it takes precedence automatically.

The server binds to `0.0.0.0` by default so it is reachable on all network interfaces. This is required for platform healthcheck proxies (e.g. Railway) to reach the app. To restrict the server to local connections only, set `APP_HOST=localhost`.

> **Deploying to Railway:** point `APP_PORT` at Railway's `PORT` variable (`APP_PORT=${{ PORT }}`) or simply rely on the built-in `PORT` precedence, and leave `APP_HOST` at its `0.0.0.0` default.

## Notes

- `app.boot(port)` mounts public assets, binds router, applies middleware, registers error handling, starts the server, and attaches graceful shutdown.
- Static asset mounting happens before configured middleware is applied.
- For middleware layering and recommended usage, see [Middleware Guide](/guide/middleware).
- Use the router contract (`getRouter`) for runtime-agnostic behavior where possible.
- Prefer `expressApp` only when you specifically need native Express APIs.

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

Use the framework-agnostic router contract.

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

## Static Assets

Express mounts the `public` directory automatically during `app.boot(port)` through the runtime driver.

Default behavior:

- serves files from `path.join(process.cwd(), 'public')`
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

## Notes

- `app.boot(port)` mounts public assets, binds router, applies middleware, registers error handling, starts the server, and attaches graceful shutdown.
- Static asset mounting happens before configured middleware is applied.
- For middleware layering and recommended usage, see [Middleware Guide](/guide/middleware).
- Use the router contract (`getRouter`) for framework-agnostic behavior where possible.
- Prefer `expressApp` only when you specifically need native Express APIs.

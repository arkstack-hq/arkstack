# Middleware Guide

Arkstack provides a structured approach to middleware configuration and execution. This guide covers where to define middleware, the execution order, and best practices for layering.

## Where middleware is configured

Define middleware in your kit's `src/config/middleware.ts` file.

Each config returns the same shape:

```ts
{
  global: [],
  before: [],
  after: [],
}
```

## Middleware execution order

Arkstack applies middleware in this order during `app.boot(port)`:

1. Public assets are mounted.
2. `global` middleware runs.
3. `before` middleware runs.
4. Routes are bound.
5. `after` middleware runs.
6. Runtime-specific startup continues (Express error handler registration, then server start).

## Static asset mounting

Static assets are mounted by the runtime driver before configured middleware runs.

Default locations:

- Express: `path.join(process.cwd(), 'public')`
- H3: `process.cwd()/public`

Use this default behavior when your app only needs a conventional `public` directory. If you need a different mount path, cache policy, or asset strategy, override `mountPublicAssets` when constructing the driver in `src/core/app.ts`.

Express example:

```ts
this.driver = new ExpressDriver({
  bindRouter: async (runtime) => {
    runtime.use(await Router.bind());
  },
  mountPublicAssets: (runtime, publicPath) => {
    runtime.use('/assets', express.static(publicPath));
  },
  errorHandler: ErrorHandler,
});
```

H3 example:

```ts
this.driver = new H3Driver({
  createApp: () => new H3({ onError: ErrorHandler }),
  bindRouter: async (runtime) => {
    await Router.bind(runtime);
  },
  mountPublicAssets: (runtime, publicPath) => {
    runtime.use(staticAssetHandler(publicPath));
  },
});
```

Use each group with this intent:

- `global`: middleware that should always run for every request (body parsing, CORS, method override, baseline security headers).
- `before`: middleware that should run before route handlers are bound/executed (request context setup, auth gates, request-level tracing).
- `after`: middleware that should run after routes are bound (post-route transforms, tail processing).

## Express example

`express/src/config/middleware.ts`:

```ts
import express, { Express } from 'express';
import cors from 'cors';
import { MiddlewareConfig } from 'src/types/config';

const config = (_app: Express): MiddlewareConfig => {
  return {
    global: [express.json(), express.urlencoded({ extended: true }), cors()],
    before: [],
    after: [],
  };
};

export default config;
```

## H3 example

`h3/src/config/middleware.ts`:

```ts
import { H3 } from 'h3';
import { MiddlewareConfig } from 'src/types/config';
import { cors } from '@app/http/middlewares/cors';

const config = (_app: H3): MiddlewareConfig => {
  return {
    global: [cors()],
    before: [],
    after: [],
  };
};

export default config;
```

## Route-level middleware

Use config middleware for app-wide concerns. For route-specific behavior, attach middleware at route declaration time.

Example from Express route registration:

```ts
import { Router } from 'src/core/router';

Router.get(
  '/',
  ({ res }) => {
    res
      .setHeader('Content-Type', 'text/html')
      .send('Welcome to the Express application!');
  },
  [
    () => {
      console.log('Middleware for root route');
    },
  ],
);
```

## Team expectation

- Prefer `src/config/middleware.ts` for cross-cutting concerns.
- Keep `global` minimal and predictable.
- Put request gating/initialization in `before`.
- Reserve `after` for true post-route concerns.
- Keep route-level middleware close to the route when the concern is route-specific.

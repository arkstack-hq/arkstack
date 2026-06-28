# @arkstack/inertia

[![@arkstack/inertia](https://img.shields.io/npm/dt/@arkstack/inertia?style=flat-square&label=@arkstack/inertia&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/inertia)](https://www.npmjs.com/package/@arkstack/inertia)

A runtime-agnostic [InertiaJS](https://inertiajs.com) server-side adapter for Arkstack. Build a single-page app (Vue, React, or Svelte) without an API: controllers return page components and props, and Inertia handles client-side routing. Works with both the Express and H3 drivers.

## Install

```sh
pnpm add @arkstack/inertia
```

Then register the middleware in `src/config/middleware.ts` under `before` (alongside `resora()`):

```ts
import { inertia, resora } from '@arkstack/driver-express/middlewares' // or @arkstack/driver-h3/middlewares

export default (): MiddlewareConfig => ({
  before: [resora(), inertia()],
})
```

Publish the config and root template:

```sh
ark publish --package @arkstack/inertia
```

## Usage

```ts
import { inertia, Inertia } from '@arkstack/inertia'

// Render a page — JSON page object on Inertia visits, full HTML on first load
return inertia('Users/Index', { users: await User.all() })

// Shared props (global at boot, or request-scoped inside a handler)
inertia().share('appName', config('app.name'))

// Partial-reload helpers
inertia('Users/Index', {
  users: await User.all(),
  stats: Inertia.lazy(() => expensiveStats()),   // only on a partial reload that asks for it
  chart: Inertia.defer(() => buildChart()),       // fetched by the client after load
  auth: Inertia.always({ user: request.user }),   // always present, even on partials
})

// Redirects (302 -> 303 for PUT/PATCH/DELETE) and external/full-page visits
Inertia.redirect('/users')
Inertia.location('https://example.com')
```

## Server-side rendering

Set `ssr.enabled` in `src/config/inertia.ts`, build an SSR bundle, and run it with the supervised command:

```sh
ark inertia:ssr   # runs dist-ssr/ssr.js, restarting it if it crashes
```

The initial visit is then server-rendered and the client hydrates it; if the SSR server is unreachable the adapter falls back to client-side rendering.

## Documentation

See the [Inertia guide](https://arkstack.toneflix.net/guide/inertia) for the full setup, partial reloads, asset versioning, configuration, and SSR.

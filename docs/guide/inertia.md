# Inertia

`@arkstack/inertia` is a runtime-agnostic [InertiaJS](https://inertiajs.com) server adapter. It lets you build a single-page app — Vue, React, or Svelte — without an API: your controllers return page components and props, and Inertia handles the client-side routing.

It works with both the Express and H3 drivers and serves responses through the same `@arkstack/http` `Response` the rest of the framework uses, so there is no special send path to wire up.

## Install

```sh
pnpm add @arkstack/inertia
```

`@arkstack/http` and `@arkstack/view` are peer dependencies (apps already have `@arkstack/http`; `@arkstack/view` is only needed to render the root template). On the client, install the Inertia adapter for your framework, e.g. `@inertiajs/vue3`.

## How it works

On the first visit Arkstack returns a full HTML document with the page object embedded in a `data-page` attribute. The Inertia client boots from it and, on every subsequent visit, sends an XHR with an `X-Inertia` header; the adapter replies with a JSON page object instead of HTML and the client swaps the page — no full reload.

```txt
{ "component": "Users/Index", "props": { ... }, "url": "/users", "version": "" }
```

## Setup

### 1. Register the middleware

Add the `inertia()` middleware to `src/config/middleware.ts` so the adapter can read the request and bind its context. Register it under `before` (alongside `resora()`) so the context is bound before your route handlers run.

::: code-group

```ts [Express]
// src/config/middleware.ts
import { inertia, resora } from '@arkstack/driver-express/middlewares';

import { MiddlewareConfig } from '@arkstack/driver-express/types';

export default (): MiddlewareConfig => {
  return {
    before: [
      resora(),
      inertia(),
    ],
  };
};
```

```ts [H3]
// src/config/middleware.ts
import { inertia, resora } from '@arkstack/driver-h3/middlewares';

import { MiddlewareConfig } from '@arkstack/driver-h3/types';

export default (): MiddlewareConfig => {
  return {
    before: [
      resora(),
      inertia(),
    ],
  };
};
```

:::

### 2. Publish the config and root template

```sh
ark publish --package @arkstack/inertia
```

This writes `src/config/inertia.ts` and a root Edge template to `src/resources/views/app.edge`. Edit the template to load your client bundle (for example, your Vite tags) — it must render the <span v-pre>`{{{ inertia }}}`</span> mount element:

```edge
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    {{{ inertiaHead }}}
    <!-- your Vite client + entry tags here -->
</head>
<body>
    {{{ inertia }}}
</body>
</html>
```

## Rendering pages

Return `inertia(component, props)` (or `Inertia.render(...)`) from a controller. The same call produces an HTML document on the first visit and a JSON page object on Inertia visits.

```ts
import { inertia } from '@arkstack/inertia';
import { User } from '@app/models/User';

export class UserController {
  async index() {
    return inertia('Users/Index', {
      users: await User.all(),
    });
  }
}
```

`props` may be plain JSON-serializable values, synchronous or asynchronous callbacks (resolved lazily, including when nested), or one of the prop wrappers below.

## Shared data

Share props with every response — globally at boot, or per request inside a handler:

```ts
import { inertia } from '@arkstack/inertia';

// At boot — applies to every request
inertia().share('appName', config('app.name'));

// Inside a request — scoped to this request only
inertia().share({ flash: session.get('flash') });
```

Page props override shared props of the same name.

## Partial reloads

Inertia can re-fetch a subset of props for the current component. The adapter honours the `only`/`except` filters automatically; you control which props participate using the prop wrappers:

| Helper                                | Initial load             | Partial reload                       |
| ------------------------------------- | ------------------------ | ------------------------------------ |
| plain value / callback                | included                 | included unless filtered out         |
| `Inertia.always(value)`               | included                 | **always** included, ignores filters |
| `Inertia.lazy(fn)` (alias `optional`) | **excluded**             | included only when requested         |
| `Inertia.defer(fn, group?)`           | **excluded**, advertised | fetched by the client after load     |

```ts
return inertia('Users/Index', {
  // always evaluated
  users: await User.all(),
  // only evaluated on a partial reload that asks for `stats`
  stats: Inertia.lazy(() => expensiveStats()),
  // excluded from the first response, fetched automatically afterwards
  chart: Inertia.defer(() => buildChart()),
  // always present, even on partial reloads
  auth: Inertia.always({ user: request.user }),
});
```

## Redirects

Use `Inertia.redirect()` / `Inertia.back()` for Inertia-aware redirects. After a `PUT`, `PATCH`, or `DELETE` the status is automatically upgraded to `303 See Other`, which the Inertia client requires to follow the redirect with a `GET`:

```ts
async update () {
    await user.save();

    return Inertia.redirect('/users'); // 303 for PUT/PATCH/DELETE, 302 otherwise
}
```

To redirect to an external URL (or force a full page visit), use `Inertia.location(url)`. On an Inertia visit it responds `409` with an `X-Inertia-Location` header so the client performs a hard navigation.

## Asset versioning

Set `version` in `src/config/inertia.ts` to a build hash (a string or a function returning one). When the client reports a different version on a `GET` visit, the adapter responds `409` with `X-Inertia-Location` and the client reloads to pick up fresh assets. Leave it `null` to disable versioning.

```ts
// src/config/inertia.ts
export default (): InertiaConfig => {
  return {
    root_view: 'app',
    version: env('INERTIA_VERSION', null),
    ssr: { enabled: false },
  };
};
```

You can also set it at runtime: `Inertia.version(() => buildHash())`.

## Configuration

| Key           | Default                         | Description                                                                            |
| ------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| `root_view`   | `app`                           | Edge template wrapping the SPA. Falls back to a minimal built-in document when absent. |
| `root_id`     | `app`                           | Id of the DOM element the client mounts onto (carries `data-page`).                    |
| `version`     | `null`                          | Asset version string, a resolver function, or `null` to disable.                       |
| `ssr.enabled` | `false`                         | Render the initial page on a Node SSR server.                                          |
| `ssr.url`     | `http://127.0.0.1:13714/render` | The SSR server's render endpoint.                                                      |
| `ssr.bundle`  | `dist-ssr/ssr.js`               | Path to the built SSR bundle run by `ark inertia:ssr`.                                 |

You can also override config at runtime with `Inertia.configure({ ... })` — handy for programmatic setups and tests.

## Server-side rendering

With SSR enabled, the **initial** visit is rendered by a separate Node process (your app's SSR bundle) and the resulting markup + head tags are embedded in the response, so crawlers and the first paint get fully rendered HTML. The client then hydrates that markup. Subsequent Inertia visits are unchanged (client-side). If the SSR server is unreachable, the adapter falls back to client-side rendering rather than failing the request.

### 1. Add an SSR entry

Create a server entry that renders a page to `{ head, body }` and starts the SSR server. With `@inertiajs/vue3`:

```ts
// src/ssr.ts
import { createInertiaApp } from '@inertiajs/vue3';
import createServer from '@inertiajs/vue3/server';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';

createServer((page) =>
  createInertiaApp({
    page,
    render: renderToString,
    resolve: (name) => {
      const pages = import.meta.glob('./Pages/*.vue', { eager: true });
      return pages[`./Pages/${name}.vue`];
    },
    setup({ App, props, plugin }) {
      return createSSRApp({ render: () => h(App, props) }).use(plugin);
    },
  }),
);
```

On the client, hydrate the server-rendered markup by using `createSSRApp` (instead of `createApp`) in your client entry's `setup`.

### 2. Build and run the SSR server

Build the SSR bundle (for example with Vite: `vite build --ssr src/ssr.ts --outDir dist-ssr`), then run it alongside your app with the `inertia:ssr` command, which supervises the process and restarts it if it crashes:

```sh
ark inertia:ssr
```

It runs `ssr.bundle` (default `dist-ssr/ssr.js`); override with `--bundle <path>`, or pass `--no-restart` to exit instead of restarting. You can also run the bundle directly with `node dist-ssr/ssr.js`.

### 3. Enable SSR

Set `ssr.enabled` in `src/config/inertia.ts` (or `INERTIA_SSR=true`). Point `ssr.url` at the SSR server if it isn't on the default port.

```ts
ssr: {
    enabled: env('INERTIA_SSR', false),
    url: env('INERTIA_SSR_URL', 'http://127.0.0.1:13714/render'),
}
```

# H3 Runtime Interaction

Arkstack's H3 runtime integration provides multiple ways to interact with the underlying H3 instance, allowing for flexible middleware application, route handling, and lifecycle control.

## Bootstrap Exports

From `src/core/bootstrap.ts`:

- `h3App`: raw H3 instance
- `app`: Arkstack `Application` instance

```ts
import { app, h3App } from 'src/core/bootstrap';
```

## Interaction Options

### 1. Raw runtime: `h3App`

Use this for direct H3 APIs.

```ts
import { h3App } from 'src/core/bootstrap';
import { HTTPResponse } from 'h3';

h3App.get('/health', () => {
  return new HTTPResponse('ok');
});
```

### 2. Instance runtime accessor: `app.getAppInstance()`

Get the runtime instance from the Arkstack wrapper.

```ts
import { app } from 'src/core/bootstrap';

const runtime = app.getAppInstance();
runtime.use((event) => {
  event.context.source = 'arkstack';
});
```

### 3. Static runtime accessor: `Application.getAppInstance()`

Access the static runtime reference.

```ts
import Application from 'src/core/app';

const runtime = Application.getAppInstance();
runtime.use(() => {
  // global middleware hook
});
```

### 4. Driver interaction: `app.getDriver()`

Use the runtime driver for lifecycle-level integration.

```ts
import { app } from 'src/core/bootstrap';

const driver = app.getDriver();
const runtime = app.getAppInstance();
await driver.applyMiddleware(runtime, () => {});
```

### 5. Router contract interaction: `app.getRouter()`

Use the framework-agnostic router contract.

```ts
import { app } from 'src/core/bootstrap';

const router = app.getRouter();
await router.bind(app.getAppInstance());

const routes = await router.list({ path: '/api' }, app.getAppInstance());
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

H3 mounts the `public` directory automatically during `app.boot(port)` through `H3Driver`.

Default behavior:

- serves files from `process.cwd()/public`
- only handles requests that look like asset paths
- blocks dotfiles and path traversal attempts
- applies long-lived cache headers and permissive CORS headers

If you need to change that behavior, override `mountPublicAssets` in `src/core/app.ts` when constructing `H3Driver`.

```ts
import { H3Driver } from '@arkstack/driver-h3';
import { staticAssetHandler } from '@arkstack/driver-h3/middlewares';

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

## Notes

- `app.boot(port)` mounts public assets, binds router, applies middleware, starts the server, and attaches graceful shutdown.
- Static asset mounting happens before configured middleware is applied.
- For middleware layering and recommended usage, see [Middleware Guide](/guide/middleware).
- Use the router contract (`getRouter`) for framework-agnostic behavior where possible.
- Prefer `h3App` only when you specifically need native H3 APIs.

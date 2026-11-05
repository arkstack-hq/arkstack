# Fastify Runtime Interaction

Arkstack's Fastify runtime integration runs the Arkstack application model on a Fastify instance. Routes, controllers, resources, validation and the console work the same as on Express and H3; this page covers what is specific to Fastify.

## Bootstrap Exports

From `src/core/bootstrap.ts`:

- `fastifyApp`: raw Fastify instance
- `app`: Arkstack `Application` instance

```ts
import { app, fastifyApp } from 'src/core/bootstrap'
```

## Interaction Options

### 1. Raw runtime: `fastifyApp`

Use this for direct Fastify APIs. Anything that changes routes, hooks or plugins must happen before the server starts, because Fastify locks the instance once it is ready.

```ts
import { fastifyApp } from 'src/core/bootstrap'

fastifyApp.decorate('serviceName', 'api')
fastifyApp.addHook('onSend', async (_req, reply) => {
  reply.header('x-runtime', 'fastify')
})
```

### 2. Instance runtime accessor: `app.getAppInstance()`

```ts
import { app } from 'src/core/bootstrap'

const runtime = app.getAppInstance()
runtime.addHook('onRequest', async (req) => {
  req.log.info({ url: req.url }, 'incoming request')
})
```

### 3. Driver interaction: `app.getDriver()`

```ts
import { app } from 'src/core/bootstrap'

const driver = app.getDriver()
await driver.applyMiddleware(app.getAppInstance(), async (req, reply) => {
  reply.header('x-request-id', req.id)
})
```

### 4. Router contract interaction: `app.getRouter()`

```ts
import { app } from 'src/core/bootstrap'

const routes = await app.getRouter().list({ path: '/api' })
console.log(routes)
```

## Middleware

Arkstack middleware runs as Fastify hooks. The positions in `src/config/middleware.ts` map to:

| Position | Fastify hook | Runs                            |
| -------- | ------------ | ------------------------------- |
| `global` | `onRequest`  | before the body is parsed       |
| `before` | `preHandler` | after the body is parsed        |
| `after`  | `onResponse` | once the response has been sent |

A middleware can be an async `(req, reply)` function, a callback `(req, reply, done)` function, or a class with a `handle` method. A callback middleware that calls `done` inside an async context (such as `localeMiddleware()`) keeps that context for the route handler.

```ts
import { formdata, requestLogger, resora } from '@arkstack/driver-fastify/middlewares'

export default (): MiddlewareConfig => ({
  global: [],
  before: [formdata(), resora()],
  after: [requestLogger()],
})
```

## Plugins

Fastify plugins are registered when the app is created, from `src/config/plugins.ts`. CORS uses `@fastify/cors`, and the driver's `limiter()` returns a `@fastify/rate-limit` entry:

```ts
import fastifyCors from '@fastify/cors'
import { limiter } from '@arkstack/driver-fastify/middlewares'

export default (): FastifyPluginEntry[] => [[fastifyCors, { origin: true, credentials: true }], limiter(100, 900)]
```

JSON, urlencoded and multipart bodies are parsed out of the box.

## Uploads

`formdata()` reads multipart fields into `req.body` and files into `req.uploads`, shaped like multer files, so file validation works the same as on Express:

```ts
;async (req) => {
  useExpressUploadContext({ files: req.uploads })
}
```

## Unified HTTP Context

Clear Router handlers receive the native Fastify `req` and `reply` objects together with request-scoped Arkstack `clearRequest` and `clearResponse` objects:

```ts
Router.get('/account', ({ req, reply, clearRequest }) => {
  reply.header('x-request-id', req.id)

  return { token: clearRequest.bearerToken() }
})
```

Resources returned from routes are sent through the reply, including the status and headers set in `withResponse()`.

## Static Assets

The `public` directory is served with `@fastify/static` during `app.boot(port)`, with `Cache-Control: public, max-age=31536000, immutable` and permissive CORS headers. Override `mountPublicAssets` when constructing `FastifyDriver` to change this.

## Host & Port Binding

Host, port, dev HTTPS (`APP_SECURE`) and tunnels (`TUNNEL`, `TUNNEL_URL`) work the same as on the [Express runtime](/guide/express-runtime#host-port-binding).

## Notes

- Inertia is not available on Fastify yet.
- The error handler is set when the app is created, so routes added at any point use it.
- `app.boot(port)` sets the app up once; later calls only start the server.

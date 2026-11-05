# @arkstack/driver-fastify

[![@arkstack/driver-fastify](https://img.shields.io/npm/dt/@arkstack/driver-fastify?style=flat-square&label=@arkstack/driver-fastify&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/driver-fastify)](https://www.npmjs.com/package/@arkstack/driver-fastify)

Fastify driver for Arkstack, providing Fastify-based runtime integration for the framework.

## Middleware Positions

Arkstack middleware runs as Fastify hooks:

| Position | Fastify hook | Runs                            |
| -------- | ------------ | ------------------------------- |
| `global` | `onRequest`  | before the body is parsed       |
| `before` | `preHandler` | after the body is parsed        |
| `after`  | `onResponse` | once the response has been sent |

A middleware can be an async `(req, reply)` function, a callback `(req, reply, done)` function, or a class with a `handle` method.

## Plugins

Fastify plugins such as `@fastify/cors` are passed to the driver and registered when the app is created. JSON, urlencoded and multipart bodies are parsed out of the box.

```ts
import fastifyCors from '@fastify/cors'
import { limiter } from '@arkstack/driver-fastify/middlewares'

new FastifyDriver({
  bindRouter: (app) => Router.bind(app),
  plugins: [[fastifyCors, { origin: true }], limiter(100, 900)],
})
```

## Uploads

The `formdata()` middleware reads multipart fields into `req.body` and files into `req.uploads`, shaped like multer files.

## Auth Middleware

```ts
import { auth } from '@arkstack/driver-fastify/middlewares'

app.get('/account', { preHandler: auth }, async (req) => ({ user: req.authUser }))
```

The middleware expects `Authorization: Bearer <token>` and attaches `user`, `authUser`, and `authToken` to the request.

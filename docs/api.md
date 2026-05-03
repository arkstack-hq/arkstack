# API Reference

This page documents Arkstack’s stable public surface across starter kits.

## Runtime Contracts

Arkstack defines framework-agnostic boundaries in `@arkstack/contract`.

### `ArkstackKitDriver<TApp, TMiddleware>`

Every driver package implements these required methods:

- `name`
- `createApp()`
- `mountPublicAssets(app, publicPath)`
- `bindRouter(app)`
- `applyMiddleware(app, middleware)`
- `start(app, port)`

Optional method:

- `registerErrorHandler(app)`

### `ArkstackRouterContract<TApp, TRoutes>`

- `bind(app)` — binds discovered routes into the runtime.
- `list(options?, app?)` — returns route metadata used by `route:list`.

### `ArkstackRouterAwareCore<TApp, TRoutes>`

Application core implementations expose:

- `getAppInstance()`
- `getRouter()`

## Shared Console Runtime

Arkstack kits use `@arkstack/console` to run common commands.

- Entry: `runConsoleKernel()`
- Loads app core from `src/core/bootstrap.ts`
- Registers built-in base commands
- Discovers local custom commands from `src/app/console/commands/*.ts`

## Built-in Commands

Run commands through the Arkstack CLI entry (for example `npx ark`).

### `route:list`

List all registered routes with columns:

- method
- path
- handler

Options:

- `--p|path?` — filter routes by path

### `make:controller`

Create a new controller.

Arguments:

- `name` — controller name

Options:

- `--api` — generate API controller stub
- `--m|model?` — attach model name
- `--force` — overwrite if file exists

### `make:resource`

Resource generator with grouped modes:

- `resource {name}`
- `collection {name}`
- `all {prefix}`

Common option:

- `--force`

### `make:full-resource`

Generate full API resource set:

- `{prefix}Resource`
- `{prefix}Collection`
- `{prefix}Controller`

Options:

- `--m|model?`
- `--force`

### `dev`

Runs development mode by executing:

```bash
pnpm exec tsdown --log-level silent
```

### `build`

Runs production build by executing:

```bash
NODE_ENV=production pnpm exec tsdown
```

## Template Profiles

Arkstack currently provides four template aliases in `create-arkstack`:

- `express`
- `express-lean`
- `h3`
- `h3-lean`

### Full Profiles

Include app scaffolding and Arkormˣ/database features.

### Lean Profiles

Remove:

- `src/app`
- `src/routes/api.ts`
- Arkormˣ/database files and dependencies

## Package Surface

Core shared packages:

- `@arkstack/contract`
- `@arkstack/common`
- `@arkstack/console`
- `@arkstack/http`
- `@arkstack/auth`

Driver packages:

- `@arkstack/driver-express`
- `@arkstack/driver-h3`

## Authentication

`@arkstack/auth` exposes the framework-neutral auth service and session contracts.

### `Auth`

- `Auth.make(secret?)` — create an auth service instance.
- `Auth.setRequest(req)` — set the current normalized request on the static auth context.
- `setRequest(req)` — set the request source for the current auth instance.
- `verify(email, password)` — verify credentials.
- `attempt(email, password)` — authenticate and return the user or throw `AuthenticationException`.
- `login(email, password)` — authenticate and create a personal access token.
- `authorizeToken(token)` — validate a bearer token and return the authenticated user.
- `createTemporaryToken(user, purpose, expiresIn?)` — create a short-lived JWT for a specific purpose.
- `authorizeTemporaryToken(token, purpose)` — validate a temporary token and return its user.
- `logout(token?)` — delete a specific token or the current user's tokens.
- `currentSession()` — create a `CurrentSession` helper for the current request.

### Driver Auth Middleware

Express:

```ts
import { auth } from '@arkstack/driver-express/middlewares';
```

H3:

```ts
import { auth } from '@arkstack/driver-h3/middlewares';
```

Both middlewares expect an `Authorization: Bearer <token>` header.

## HTTP

`@arkstack/http` exposes framework-neutral wrappers:

- `Request.from(source?)`
- `request.header(name)`
- `request.bearerToken()`
- `request.setUser(user)`
- `request.user`
- `Response.from(source?)`
- `response.status(code)`
- `response.json(body)`

## Common Utilities

`@arkstack/common` exposes:

- `ErrorHandler` — class-based error normalization, logging, and payload creation.
- `Exception`, `AppException`, `RequestException` — shared exception classes.
- `Hash` — password hashing and verification helper.
- `Encryption` — encryption/decryption helper.
- `getModel(name)` — typed app model resolver.
- `perPage(query)` — pagination limit helper.

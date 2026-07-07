# API Reference

This page documents Arkstack’s stable public surface across runtime drivers and generated applications.

## Runtime Contracts

Arkstack defines runtime-agnostic boundaries in `@arkstack/contract`.

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

### `Arkstack<TApp, TRoutes>`

Application core implementations expose:

- `getAppInstance()`
- `getRouter()`
- `startup()`
- `boot()`
- `setRootDir()`
- `getRootDir()`

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

Runs development mode by launching the tsdown watcher directly with Node (falling back to `pnpm exec tsdown` if tsdown cannot be resolved):

```bash
node <tsdown-bin> --log-level silent
```

Options:

- `--t|tunnel` — tunnel the dev server through Ngrok
- `--host` — expose the dev server on the local network (binds `0.0.0.0` and prints the network URL; otherwise binds `127.0.0.1`)
- `--s|secure` — serve the dev server over HTTPS with an auto-generated self-signed certificate

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
- `@arkstack/notifications`
- `@arkstack/realtime` (client)
- `@arkstack/view`
- `@arkstack/inertia`

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
- `session()` — create a `Session` helper for the current request.

### `TwoFactor`

- `createSetup(user, secret?)` — create an authenticator secret and `otpauthUrl`.
- `verifyCode(user, secret, code)` — verify an authenticator app code.
- `setSecret(userId, secret)` / `getSecret(userId)` / `clearSecret(userId)` — manage encrypted authenticator secrets.
- `setMethod(userId, method)` / `getMethod(userId)` — manage the active 2FA method.
- `setEnabledAt(userId, enabledAt?)` / `getEnabledAt(userId)` — manage enabled state.
- `generateBackupCodes(count?)` — create printable recovery codes.
- `hashBackupCodes(codes)` / `writeRecoveryCodeHashes(userId, hashes)` — store recovery codes.
- `consumeRecoveryCode(userId, recoveryCode)` — verify and remove one recovery code.
- `issueSmsCode(user, purpose)` — create, hash, and store an SMS challenge code.
- `verifySmsCode(userId, code, purpose)` — verify and consume an SMS challenge code.
- `readStatus(userId)` — return enabled state, method, timestamp, and remaining recovery codes.

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

## Notifications

`@arkstack/notifications` exposes framework-neutral notification drivers.

### `Notification`

- `Notification.mail(options?)` / `Notification.email(options?)` — create a mail notification driver.
- `Notification.sms(options?)` — create an SMS notification driver.
- `Notification.db()` — create a database notification driver.
- `Notification.realtime(options?)` — create a realtime (Pusher/Firebase) broadcast driver.
- `Notification.channel(channel?, options?)` — create a driver from a channel or `notifications.default_driver`.
- `new Notification(channel, options?).prepare(recipient, data?)` — prepare a driver using a user-like recipient or direct address.

Mail recipients support strings, arrays of strings, `{ 'address@example.com': 'Name' }`, and arrays of named address objects.

### `RealtimeNotification`

Broadcasts a notification to connected clients over Pusher Channels or Firebase Cloud Messaging.

- `.recipient(user | channel)` — a `User` (channel is `${channel_prefix}${user.id}`) or an explicit channel string.
- `.channel(name)` / `.event(name)` — override the channel and the client event name (default `notification`).
- `.type(type)` / `.action(text, link)` / `.meta(data)` — build the payload.
- `.store(enabled?)` — also persist the notification (requires a `User` recipient) so clients can load history.
- `.send(message, subject?, recipient?, data?)` — broadcast; resolves to `{ channel, event, payload, stored? }`.

### Notification Config

- `notifications.default_driver` — default channel for `Notification.channel()`.
- `notifications.drivers.mail.transport` — mail transport name, usually `smtp`.
- `notifications.drivers.sms.transport` — SMS transport name, `africastalking` or `twilio`.
- `notifications.drivers.db.table` — database notifications table name.
- `notifications.drivers.realtime` — realtime `transport` (`pusher` | `firebase`), `channel_prefix`, `event`, and default `store`.
- `notifications.transports.smtp` — SMTP connection options.
- `notifications.transports.africastalking` — AfricasTalking credentials.
- `notifications.transports.twilio` — Twilio credentials.
- `notifications.transports.pusher` — Pusher app credentials (`app_id`, `key`, `secret`, `cluster`, `use_tls`).
- `notifications.transports.firebase` — Firebase service-account credentials (`project_id`, `client_email`, `private_key`).

The `pusher` / `firebase-admin` SDKs are optional peer dependencies, imported lazily only when the realtime transport is used.

### `@arkstack/realtime` (client)

The framework-neutral client for consuming realtime notifications, with React and Vue bindings.

- `createRealtime(config)` — create a `RealtimeClient` (config: `transport`, `event`, `channelPrefix`, `pusher`/`firebase`, or a custom `transportFactory`).
- `client.subscribe(channel, handler)` / `client.forUser(userId, handler)` — subscribe; returns an unsubscribe function.
- `client.channelFor(userId)` — the per-user channel name; `client.disconnect()` — tear down the connection.
- `@arkstack/realtime/react` — `useNotifications(client, channel, { limit? })` → `{ notifications, latest, clear }`.
- `@arkstack/realtime/vue` — `useNotifications(client, channel, { limit? })` → `{ notifications, latest, clear, stop }`.

The `pusher-js` / `firebase` SDKs (and `react` / `vue` for the bindings) are optional peer dependencies.

### `UserNotificationCenter`

- `create(user, payload)` — store a database notification.
- `forUser(user)` — list stored notifications for a user.
- `unreadForUser(user)` — list unread notifications for a user.
- `markAllRead(user)` — mark every unread notification for a user as read.
- `markRead(notification)` — mark a notification as read.
- `delete(notification)` — delete a notification.

## Views

`@arkstack/view` exposes Edge.js powered rendering.

### `view`

- `view(name, data?)` — create a renderable view instance. The result can be awaited or rendered with `.render()`.
- `view()` — return the shared view factory.
- `view().share(key, value)` / `view().share(data)` — share data with every view rendered by the shared factory.

### `View`

- `View.make(name, data?)` — create a renderable view instance.
- `View.first(names, data?)` — create the first existing view from a list.
- `View.exists(name)` — check if a view exists.
- `View.share(key, value)` / `View.share(data)` — share data globally.
- `View.composer(names, callbackOrComposer)` — register a view composer function, class, or instance with `compose()`.
- `View.mount(path)` / `View.mount(name, path)` — mount view directories.
- `View.raw(name, contents)` — register an in-memory Edge template.
- `view().tag(name, block, seekable, compile)` — register a custom Edge tag.
- Package scoped names use `~package-name.view` and `~org/package-name.view`.

### Vite assets

- `@vite('resources/js/app.ts')` — Edge tag that emits the Vite dev-server tags in development and the hashed manifest assets in production. Accepts a single entry or an array.
- `@viteReactRefresh` — Edge tag that emits the React Refresh preamble in development (place it **before** `@vite`). Required when using `@vitejs/plugin-react`, since the page is rendered by Edge rather than Vite; otherwise React throws "can't detect preamble". Emits nothing in production.
- `viteTags(entries, options?)` — the function backing the `@vite` tag (`hot`, `devUrl`, `manifest`, `buildDir` options).
- `viteReactRefresh(options?)` — the function backing the `@viteReactRefresh` tag (`hot`, `devUrl` options).

## Inertia

`@arkstack/inertia` exposes a framework-neutral [InertiaJS](https://inertiajs.com) server adapter. See the [Inertia guide](/guide/inertia) for usage.

### `inertia`

- `inertia(component, props?)` — render an Inertia page (returns a `Response`).
- `inertia()` — return the `Inertia` manager for chaining.

### `Inertia`

- `Inertia.render(component, props?)` — render a page: a JSON page object on Inertia visits, an HTML document on the first visit.
- `Inertia.share(key, value)` / `Inertia.share(data)` — share props with every response (request-scoped inside a request, global outside).
- `Inertia.shared()` — read the currently shared props.
- `Inertia.version(version)` — set the asset version (string or resolver function).
- `Inertia.configure(partial)` — override Inertia config at runtime (e.g. enable SSR).
- `Inertia.location(url)` — `409` + `X-Inertia-Location` on an Inertia visit, otherwise a `302` redirect.
- `Inertia.redirect(url, status?)` — redirect, upgrading `302` to `303` for `PUT`/`PATCH`/`DELETE`.
- `Inertia.back(fallback?)` — redirect to the referring URL.
- `Inertia.lazy(fn)` / `Inertia.optional(fn)` — a prop resolved only on a partial reload that requests it.
- `Inertia.always(value)` — a prop always included, even on partial reloads.
- `Inertia.defer(fn, group?)` — a prop excluded from the initial response and fetched by the client afterwards.

### Driver Middleware

Express:

```ts
import { inertia } from '@arkstack/driver-express/middlewares';
```

H3:

```ts
import { inertia } from '@arkstack/driver-h3/middlewares';
```

Register it in `src/config/middleware.ts` under `before` (alongside `resora()`). The middleware binds the Inertia request context and upgrades mutation redirects to `303`.

### Commands

- `ark inertia:ssr` — run and supervise the Inertia SSR server (the built SSR bundle), restarting it if it crashes. Options: `--bundle <path>`, `--no-restart`.

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
- `Hook` — process-local hook registry with `set`, `has`, `get`, `getAll`, `unset`, and `clear`.
- `Publisher` — registry for `ark publish`: `publishes(group)`, `publishables(filter?)`, `confirm(confirmation)`, `confirmables(package | true)`, and `clear()`. See the [publish guide](/guide/cli#publish).
- `getModel(name)` — typed app model resolver.
- `perPage(query)` — pagination limit helper.

### Custom error responses

Uncaught exceptions are serialized to a standard payload — `{ status, code, message, errors?, stack? }`. To add fields to, or reshape, that response, set a `body` on an `AppException` (or a subclass). When present, `body` is merged **over** the standard payload, so it can both add custom fields and override the defaults (`status`, `code`, `message`, …).

```ts
import { AppException } from '@arkstack/common';

// Add fields to the standard error payload
class PaymentException extends AppException {
  body = { error_code: 'PAYMENT_FAILED', retryable: true };
}

throw new PaymentException('Payment failed', 402);
// → { status: 'error', code: 402, message: 'Payment failed',
//     error_code: 'PAYMENT_FAILED', retryable: true }
```

`body` can also be assigned per-instance (`error.body = { ... }`), and works on any thrown error carrying a `body` property, not just `AppException`.

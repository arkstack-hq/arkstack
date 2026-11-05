# Changelog

All notable Arkstack changes are documented in this file.

The format follows semantic versioning principles.

## [Unreleased]

No unreleased changes are documented yet.

## [0.22.0] - 2026-11-05

### Added

- Added the Fastify runtime: `@arkstack/driver-fastify`, the `fastify` starter template, and a Fastify option in `create-arkstack`. Inertia is not available for Fastify yet.
- Added the `ServerDriver` base class to `@arkstack/common`, which the Express, H3 and Fastify drivers share for server startup.
- Added the Versioning and Releases and Upgrading guides to the docs.

### Changed

- Updated resora to `1.3.36`, `@resora/plugin-clear-router` to `1.0.73`, and clear-router to `2.9.4`.

## [0.21.0 - 0.21.1] - 2026-10-28 to 2026-11-05

Released versions: `0.21.0`, `0.21.1`.

### Added

- Added `@arkstack/lang` with file-based translations under `src/lang/{locale}`, the `__()` helpers, plural forms, per-request locale middleware (`localeMiddleware()` and `h3LocaleMiddleware()`), and translation commands. The Express and H3 templates include it.

### Changed

- `@arkstack/console` and `@arkstack/console-slim` import resora's CLI classes from `resora/cli`, and the resora catalog version is `^1.3.35`. `@h3ravel/musket` is now an optional peer of resora.

## [0.20.0 - 0.20.2] - 2026-10-21 to 2026-10-23

Released versions: `0.20.0`, `0.20.1`, `0.20.2`.

### Added

- `Hook.emit(name, pos, ...args)` calls a hook position and returns its result (a Promise for async hooks); it is a no-op when nothing is registered, so call sites drop the `if (Hook.has(...))` guard. `Hook.on()`, `Hook.off()` and `Hook.all()` are the new names for `set()`, `unset()` and `getAll()`.
- `server:start` hook, run by the Express and H3 drivers once the server is listening, after the startup banner and any tunnel. `after` always runs and receives `ServerStartInfo` (exported from `@arkstack/contract`): `host`, `port`, `scheme`, `secure`, a browsable `url`, and `tunnelUrl` (`TUNNEL_URL`, or the URL `ark dev -t` opened). `tunneled` runs next, only when a tunnel is open, with `TunneledServerStartInfo` (where `tunnelUrl` is always a string). A failing listener is logged and never stops the server or skips the other position.

### Changed

- `@arkstack/common` re-exports `Hook` and its types from `@arkstack/foundry` instead of shipping its own copy. Declare typed hook names by augmenting `HookRegistry` on `@arkstack/foundry`; an augmentation of `@arkstack/common` no longer has any effect.
- Deprecated `Hook.set()`, `Hook.unset()`, `Hook.getAll()`, and calling a hook through `Hook.get(name, pos, ...args)`; they keep working. `on()` accepts a partial set of positions for typed hooks.
- The templates are formatted with Prettier.

### Fixed

- `@arkstack/common` and `@arkstack/foundry` each had their own `Hook` registry, so hooks registered through one import never fired for code reading the other. The Express auth middleware read `common`'s, so `middleware:auth` hooks registered as documented (via `foundry`) never ran on Express.
- The `shutdown` hook checked for a `before` position but called `after`; it now runs `before`.
- `Hook.unset(name)` / `remove(name)` with a name that wasn't registered cleared every hook.
- H3's auth middleware now awaits `middleware:auth` hooks, as Express already did.
- Every JWT now carries a random `jti`. Two logins by the same user within one second produced identical tokens, and the second failed on the unique `personal_access_tokens.token` column.
- `Hash.otp` derives each label's TOTP secret from `APP_KEY`. It used one hardcoded secret for every label, so a code issued for one account was valid for all of them.

## [0.19.0 - 0.19.6] - 2026-10-10 to 2026-10-21

Released versions: `0.19.0` through `0.19.6`.

### Added

- Added the `Broadcast` facade to `@arkstack/notifications`: a channel authorization registry (`Broadcast.channel('private-team.{teamId}', authorizer)`) used by every transport, `Broadcast.broadcast()` for arbitrary events, `Broadcast.handleAuth()` for custom auth routes, `Broadcast.clientConfig()`, and `Broadcast.routes()` registering `POST /realtime/auth` and `GET /realtime/config`.
- Added the `firebase-database` realtime transport (Firebase Realtime Database channels with per-user, time-limited grants checked by security rules, plus bounded `prune()`), the signal-only `polling` transport, and the `memory` transport for tests, on both server and client.
- Added device push alongside any streaming transport: `drivers.realtime.push: 'firebase'` pushes notifications sent to a user to their devices, with `push_tokens` for resolving tokens, `.push(false)` and `.devices(tokens)` per send, and the multicast outcome on `result.push`.
- Added self-hosted Pusher-protocol servers (soketi) through `transports.pusher.host` / `port` and the client's `wsHost` / `wsPort`.
- Added `RealtimeClient.onPoll()`, `RealtimeClient.deviceToken()` and `RealtimeClient.transportName` to `@arkstack/realtime`, with `createFirebaseDatabaseTransport`, `createPollingTransport`, `createMemoryTransport` and `emitMemoryEvent`.
- `RealtimeClient.deviceToken({ serviceWorker })` takes a service worker registration or script URL (registered with the Firebase web config as `firebaseConfig`), returns `null` where web push is unsupported, and falls back to the `firebase` config when streaming over another transport. `requestDeviceToken()` issues a token without a client.
- `RealtimeConfig.importModule` loads the transport SDKs (`pusher-js`, `firebase/*`) for every transport and for device tokens, so pages without a bundler can load them from a CDN. Defaults to a dynamic `import()`. The `createPusherTransport`, `createFirebaseTransport`, `createFirebaseDatabaseTransport` and `requestDeviceToken` helpers accept it as an extra argument.
- `transports.pusher.public_host` / `public_port` / `public_use_tls` (`PUSHER_PUBLIC_*`) set the Pusher-protocol server address handed to browsers when it differs from the one the app uses, such as soketi inside Docker or behind a TLS proxy. Each defaults to its server-side counterpart.
- `ark queue:work --queue` accepts a comma-separated priority list (`--queue=webhook,ocr,default`) and the `*` wildcard for every queue on the connection (`--queue=*`, or `--queue=webhook,*` to put some first). `Worker.runNextJob()` and `daemon({ queue })` take a string or a list. `QueueContract.popAny()` backs the wildcard: the `database` driver takes the oldest due job across all queues, and the `redis` driver discovers queues with `SCAN` and works them round-robin. A bare `queue:work` still works only the default queue.

### Changed

- The templates' `src/config/notifications.ts` includes the new transports, `realtime.push`, and the Pusher host options.

### Docs

- Documented realtime transports, channel authorization, device push, Firebase Realtime Database rules and pruning, polling, and testing with the memory transport in the notifications guide.

### Fixed

- `ark queue:work --queue` rejected every value in 0.19.5 ("argument '…' is invalid. Allowed choices are …"): musket reads a trailing `: a, b, c` in an option's description as its allowed choices, and the new `--queue` description had one. The description no longer does, and a test pins that `queue:work` options declare no choices.
- `DotPath` (the key type behind `config()` and `configure()`) is now depth-bounded and stops at built-in object types, so configs holding deep or self-referencing library types (nodemailer transports) no longer fail to typecheck with "circularly references itself". The `@ts-expect-error` workarounds in the H3 template and the notifications config are gone.
- `build:templates` builds the templates one at a time; run in parallel, each template's prebuild rebuilt the shared packages concurrently and the builds clobbered each other.
- Fixed type errors in `@arkstack/auth` (`AuthenticationException` request typing and two tests) and in `@arkstack/common`'s `renderError`, which used the `view()` global without a type for it.
- Express `after` middleware no longer resumes the router once the response has finished. It used to receive the real `next`, so a middleware such as `requestLogger()` sent each request on through the remaining routes after responding, raising "Cannot set headers after they are sent to the client".
- A failing Express `after` middleware exited the process: `Logger.error` exits by default, and the post-response handler didn't pass `exit = false`.
- `UserNotificationCenter.markAllRead()` now marks every unread notification read; it used a single-row `update()` and marked only one. `unreadForUser(user, perPage)` now honours `perPage`, and both filter unread rows with `whereNull('readAt')`.
- `UserNotificationCenter.send()` (and `Notification.db().broadcast()`) now broadcast on the user's channel. They previously sent to the user's push tokens as channels, so nothing was broadcast at all for users without tokens. Apps on the `firebase` transport still reach their users' devices without changes, because device push is on there unless `drivers.realtime.push` is `false`.
- `Notification.db().broadcast()` now returns the builder, so it chains as documented.
- The Pusher auth route registered by `registerAuthRoute()` now answers with HTTP 200 (pusher-js rejects any other status), registers on the H3 driver instead of the Express one, and authorizes through the channel registry.

## [0.18.0 - 0.18.12] - 2026-08-27 to 2026-09-28

Released versions: `0.18.0` through `0.18.12`.

### Added

- Added `@arkstack/encryption`, a zero-dependency isomorphic encryption package built on the Web Crypto API, with symmetric encryption, key helpers, end-to-end secure channels and sealed boxes. `@arkstack/common` re-exports it as `Encryption`.
- Added `.priority()`, `.ttl()` and `.collapseKey()` to the realtime notification builder, with defaults under `drivers.realtime.delivery`, so Firebase broadcasts can wake a device and replace earlier ones.
- Added `loadJobs()`, which registers the application's job classes in `queue:work` processes.
- Added `setModelResolver()` to `@arkstack/common`, so `getModel()` resolves models through the configured database integration instead of loading a specific ORM.

### Changed

- Moved the Express and H3 drivers into their own `ExpressDriver` and `H3Driver` modules, and streamlined the `TwoFactor` class.
- `queue:work` logs each job's outcome, including whether a failed job will be retried.
- The console works without arkormx installed.
- Scheduled tasks are due for the whole minute they are scheduled in.

### Fixed

- Fixed `env()` destroying hexadecimal secrets. A `0x`-prefixed 32-byte key parses as a number, so it was silently replaced by a float keeping roughly its first thirteen digits. `env()` now reads a value as a number only when the number says exactly what was written: `'6379'` is still a number; `'0x1f'`, `'007'`, `'1e5'`, `' 12 '`, `'0b1010'`, `'Infinity'` and `'12345678901234567890'` are now the strings they were written as.
- Fixed `queue:work` workers failing every job with "Job X is not registered", and deleting it without a record.
- `queue:work --stop-when-empty` and `--max-jobs` now take effect.
- Fixed `FormDataMiddleware` option types.

## [0.17.4 - 0.17.24] - 2026-07-15 to 2026-08-25

Released versions: `0.17.4` through `0.17.24`.

### Added

- Added `getModelSync()`.
- Added `sendmail` and `ses` mail transports, wider nodemailer config options, and custom realtime and mail notification transports.
- Added mail attachments and queued notifications.
- Added the `resolvePagination()` helper, with optional defaults for it and `perPage()`.
- Added the realtime `apiUrl` config, Pusher channel authorization, and `registerAuthRoute()`.
- Added realtime client events for the Pusher and Firebase transports.
- Added ngrok tunneling to `ark dev`.
- Added resource copying to the tsdown build configuration.

### Changed

- Upgraded musket and used its CLI lifecycle for teardown.
- `env()` and `config()` are available globally to the prepare command and every subsystem.
- The console syncs arkormx artifacts during prepare, and generated tsconfigs include `.arkormx/*.d.ts`.

### Fixed

- Fixed the mail from-address being undefined for custom transports.
- `registerAuthRoute()` now validates requests.
- `requestLogger()` reports the full request duration.
- `MailNotification.attachment()` and `attachments()` return the notification, so they chain.
- The dev tunnel stays the same across restarts.
- Arkorm boots at every place that needs it.

## [0.17.3] - 2026-07-14

### Added

- Added request-scoped Clear Router container bindings for Arkstack `Request`, `Response`, and `Session` instances.
- Added automatic `arkstackHttpPlugin` registration to the Express and H3 drivers.
- Added `clearRequest` and `clearResponse` context values backed by the unified Arkstack HTTP classes.
- Added automatic Clear Router decorator setup through `@arkstack/http`, allowing controller arguments decorated with `@Bind()` to resolve without additional container setup.

### Changed

- Resolve the global `request()`, `response()`, and `session()` helpers from the active request scope while retaining fallback instances outside a routed request.
- Preserve unified request body, query, params, route, context, and original request data when creating an Arkstack `Request` from a framework request.
- Updated Clear Router to `2.9.2`, `@arkormx/plugin-clear-router` to `0.1.54`, and `@resora/plugin-clear-router` to `1.0.68`.

### Fixed

- Fixed concurrent requests sharing stale global request, response, or session instances.
- Fixed repeated dependency resolution returning different HTTP objects within the same request.
- Fixed the database queue driver eligibility query by comparing `available_at` against the database's current timestamp.

### Tests

- Added integration coverage proving bare `@Bind()` controller arguments resolve the same request-scoped Arkstack HTTP instances, including across concurrent requests.

### Docs

- Added integrated Arkstack guides and sidebar references for Resora responses, Arkormˣ database access, Kanun validation, and Parasito HTTP testing.
- Documented request-scoped HTTP objects, controller injection, global helpers, automatic driver registration, and native framework interoperability.
- Restored the missing changelog history from `0.4.1` through `0.17.2`.

## [0.17.0 - 0.17.2] - 2026-07-09

Released versions: `0.17.0`, `0.17.1`, `0.17.2`.

### Added

- Added `@arkstack/scheduler` with Laravel-style scheduled tasks.
- Added support for both `per_page` and `per-page` query parameters in pagination helpers.

### Fixed

- Made the `per_page` argument optional in `perPage()`.
- Corrected queued-job `available_at` handling and resolved lint errors across the workspace.

## [0.16.0 - 0.16.13] - 2026-06-28 to 2026-07-07

Released versions: `0.16.0` through `0.16.13`.

### Added

- Added a complete React and Inertia starter, Inertia stack selection in `create-arkstack`, React Refresh support, and production Vite asset resolution.
- Added `@arkstack/realtime` clients for core, React, and Vue applications.
- Added Pusher and Firebase realtime notification drivers, Firebase service-account configuration, and multicast broadcasting.
- Added `UserNotificationCenter.send()`, paginated unread notifications, database-notification push delivery, and `PhoneNumber` support for SMS recipients.
- Added interactive package selection and package config publishing to the console.

### Changed

- Boot Arkorm before console commands run.
- Published scaffolding stubs with their packages and made generated config interface keys valid TypeScript.
- Resolved the global `env()` helper through `EnvLoader` and allowed named mail from-addresses.

### Fixed

- Fixed production Inertia assets, database and realtime notification recipient checks, and realtime push-token resolution.

## [0.15.0 - 0.15.5] - 2026-06-27 to 2026-06-28

Released versions: `0.15.0` through `0.15.5`.

### Added

- Added the `@arkstack/inertia` server adapter, server-side rendering, real HTTP and browser coverage, and the `ark inertia:ssr` command.
- Added `--host` and `--secure` options to `ark dev`.
- Added Edge tags for `@vite`, `@viteReactRefresh`, `@inertia`, and `@inertiaHead`.

### Changed

- Run tsdown directly from `ark dev` instead of through a package-manager wrapper.
- Made Arkorm an optional peer dependency of common, console, and HTTP packages.
- Moved shared dependencies into the workspace catalog.

### Fixed

- Fixed Inertia client hydration and loading common, console, and HTTP without Arkorm installed.

## [0.14.0 - 0.14.22] - 2026-06-22 to 2026-06-27

Released versions: `0.14.0` through `0.14.3`, and `0.14.14` through `0.14.22`.

### Added

- Unified application secrets under `APP_KEY` and added guaranteed key generation.
- Added an ngrok-powered `tunnel` option and exposed the tunnel URL through the application globals and environment.
- Added runtime-directory resolution for production builds and deployment guidance.
- Added lazy `.env` loading, typed `env()` return values through `EnvRegistry`, and generated environment registry declarations.
- Added the built-in Faker integration with Pictwo image support.
- Allowed `AppException` to define a custom response body and `AppConfig` to be extended.

### Changed

- Replaced the key-generation ignore option with the global `--no-interaction` option.
- Updated application module, resource, and config loading to resolve from production build output.
- Updated Clear Router and its plugins to the `2.9` line.

### Fixed

- Made config loading resilient to individual module failures and alternate build layouts.
- Prevented duplicate `export {}` declarations in generated types.

## [0.13.0 - 0.13.2] - 2026-06-21 to 2026-06-22

Released versions: `0.13.0`, `0.13.1`, `0.13.2`.

### Added

- Added the `@arkstack/cache`, `@arkstack/queue`, and `@arkstack/jobs` packages.
- Added native Arkorm and Resora database configuration.
- Added explicit `lean` and `full` project-creation options.

### Fixed

- Resolved workspace catalog dependencies when creating projects outside the monorepo.
- Preserved comments and spacing when creating `.env` files.
- Updated release preparation to keep Create Arkstack template metadata in sync.

## [0.12.0 - 0.12.37] - 2026-05-28 to 2026-06-20

Released versions: `0.12.0`, `0.12.1`, and `0.12.3` through `0.12.37`.

### Added

- Added `@arkstack/foundry` and centralized application lifecycle hooks and globals.
- Added custom filesystem disk drivers, in-memory config updates, current disk and driver accessors, and Google Cloud Storage support.
- Added `APP_ENV`, build development mode, class-based middleware, stateless route session opt-in, and package-model aliases.
- Added `APP_HOST` with `HOST` fallback and support for the platform-provided `PORT` variable.
- Added `VERBOSITY` support to the prepare script.

### Changed

- Centralized config typing and improved generated config interfaces.
- Load custom console commands directly from TypeScript source through jiti, with build output retained as the production fallback.
- Bind application servers to `0.0.0.0` by default and prefer `PORT` over `APP_PORT`.
- Updated release tooling to synchronize workspace catalog dependency versions.

### Fixed

- Fixed authentication request synchronization and hydration of bound HTTP requests.
- Fixed filesystem disk registration when disk and driver names differ.
- Preserved conflicting trait methods and made invalid trait errors clearer.
- Made console builds recover from stale `.arkstack/build` output and ensured config is ready before tsdown runs. `rebuildOutput()` in `@arkstack/common` wipes the output directory and runs a build-only tsdown pass.
- Templates clean the output directory on build and prepare, so renamed or removed source files can't leave stale modules behind.
- Improved route-loading errors and prevented dot-path config updates from replacing the entire store.

## [0.11.0 - 0.11.6] - 2026-05-28

Released versions: `0.11.0` through `0.11.6`.

### Added

- Added the `@arkstack/foundry` package and moved shared hook and lifecycle behavior into it.
- Added Twilio to the typed SMS transport configuration.
- Added options forwarding to `importFile()`.

### Changed

- Centralized application lifecycle handling, lifecycle globals, and generated config types.

## [0.10.0 - 0.10.10] - 2026-05-27

Released versions: `0.10.0` through `0.10.10`.

### Added

- Added an application-scoped root directory and made default framework paths resolve from it.
- Expanded manual Create Arkstack options with kit choices, kit locking, and token requirements.

### Changed

- Moved request-body and session augmentations into `@arkstack/http` and shared Resora config types into common code.
- Removed duplicated starter boilerplate and the retired `arkstack-express` workspace package.

### Fixed

- Lazy-load optional auth dependencies in runtime drivers.
- Fixed manual project-creation overrides and lean-profile database setup.

## [0.9.0 - 0.9.1] - 2026-05-26

Released versions: `0.9.0`, `0.9.1`.

### Changed

- Refactored framework bootstrapping around self-initializing core packages to reduce starter boilerplate.
- Hardened prepare and template build workflows for clean CI environments.

## [0.8.0] - 2026-05-23

### Added

- Added persistent sessions, flash data, validation error bags, and automatic view error sharing.
- Added encrypted session payloads and file-based SMTP transport support.

### Changed

- Restricted CORS origins to configured defaults and consolidated application configuration.

## [0.7.0 - 0.7.20] - 2026-05-14 to 2026-05-22

Released versions: `0.7.0` through `0.7.20`.

### Added

- Added JWT auth utilities, request rate limiting, Clear Router integration coverage, and custom HTML and text mail templates.
- Added the trait composition system, including class roots, Arkorm model integration, and conflicting-method support.
- Added a single entry point for global request, response, and context initialization.

### Changed

- Renamed `CurrentSession` and `currentSession()` to `Session` and `session()`.
- Updated starter migrations to use UUID primary and foreign keys.
- Renamed auth device payload types and aligned auth, notification, Clear Router, Arkorm, and Resora integrations.

### Fixed

- Ensured placeholder global request and response values are callable before runtime initialization.

## [0.6.0 - 0.6.4] - 2026-05-13

Released versions: `0.6.0` through `0.6.4`.

### Added

- Added the H3 application starter with routing and middleware.
- Added template resource mounting during project creation.

### Changed

- Reworked package builds and publishing around generated templates and minified ESM output.

### Fixed

- Included package resources in published artifacts and corrected console binary exports and release paths.

## [0.5.0 - 0.5.2] - 2026-05-11

Released versions: `0.5.0`, `0.5.1`, `0.5.2`.

### Added

- Added the initial `@arkstack/database` package, migrations, model factories, and seeders.
- Added CORS and form-data middleware and controller binding coverage.
- Added project scope selection and clearer template hints to Create Arkstack.

### Changed

- Updated controllers to return Resora resources and collections.
- Moved application models into the database model directory and removed obsolete core helpers and drivers.

### Fixed

- Await auth middleware hooks and standardized model identifier declarations.

## [0.4.1 - 0.4.2] - 2026-05-08

Released versions: `0.4.1`, `0.4.2`.

### Added

- Added authentication to global request and context objects.
- Integrated View bootstrapping into the shared application bootstrap and test setup.

### Changed

- Made `View.boot()` return the factory when no view name is supplied.
- Resolve router imports from the active runtime and improved package prepublish build handling.

### Fixed

- Corrected global view instance resolution and expanded notification test coverage.

## [0.4.0] - 2026-05-07

### Added

- Added `@arkstack/view`, powered by Edge.js, with `view()`, `View.make()`, `View.first()`, `View.exists()`, `View.share()`, local view `with()`, view composers, class-based composers, package-scoped views, and the auto-discovered `make:view` command.
- Added `@arkstack/notifications` with mail, SMS, and database notification drivers.
- Added SMS transports for AfricasTalking and Twilio.
- Added database-backed in-app notifications through `UserNotification` and `UserNotificationCenter`.
- Added two-factor authentication helpers to `@arkstack/auth`, including authenticator setup, SMS codes, recovery codes, and 2FA status helpers.
- Added `UserTwoFactor` and `UserNotification` contracts, starter models, and migrations.
- Added `Hook` to `@arkstack/common` and documented the `middleware:auth` hook.
- Added `notifications.ts` config to Express and H3 templates.
- Added `welcome.edge` views and rendered them from the default `/` web routes.
- Added Vitest setup and basic assertions for Express and H3 templates.
- Added real notification delivery assertions for mail, SMS, and database notifications.

### Changed

- Updated auth tests to use `parasito` instead of `supertest`.
- Updated Express and H3 auth middleware to support the shared `middleware:auth` hook contract.
- Updated `@arkstack/notifications` config to use `default_driver`, `drivers`, and `transports`.
- Updated mail recipients to support named address maps like `{ 'person@example.com': 'Person Name' }`.
- Renamed the in-app notification driver to `db`.
- Updated SMS notification transport selection to use `transport` for the provider and keep `driver` as the notification channel concept.
- Updated `clear-router` to `2.3.5`.
- Updated `arkormx` to `2.0.7`.
- Updated `@resora/plugin-clear-router` to `0.1.6`.
- Updated docs styling and the landing page to match the Arkstack welcome page visual system.
- Updated the Architecture Overview to reflect the current package architecture and extension points.

### Docs

- Added notifications guide.
- Added views guide.
- Added hooks guide.
- Expanded authentication docs for 2FA and auth middleware hooks.
- Expanded API reference for notifications, views, hooks, and two-factor authentication.
- Documented package-scoped views like `~package-name.mail` and `~org/package-name.mail`.
- Documented class-based view composers.
- Updated the docs landing page with interactive runtime tabs, feature selection, package chips, and a consistent Arkstack theme.
- Added Discord and npm social links to the docs config.

### CI / Release

- Added release version preparation automation.
- Updated publish workflow npm authentication.
- Updated prepublish workflow coverage with PostgreSQL-backed testing.

### Fixed

- Downgraded `@types/express` to `5.0.6` for compatibility.
- Removed stale generated VitePress cache files from the tracked docs tree.

## [0.2.1] - 2026-04-28

## Breaking changes

- Moved to Arkormˣ 2.x which no longer uses Prisma. This includes changes to migration and model definitions, as well as the query API. See the [database modeling guide](https://arkstack.toneflix.net/guide/database-modeling) for details on how to update your code.
- Removed Prisma and related dependencies from both Express and H3 kits. This means that if you were using the full templates, you will need to update your database configuration and model definitions to work with Arkormˣ instead.
- The `make:model` command which is an extension of the Arkormˣ model generator now creates Arkormˣ model files instead of Prisma schema files. This includes changes to the generated model structure and syntax.

### Added

- Framework-agnostic shared packages: `@arkstack/contract`, `@arkstack/common`, `@arkstack/console`.
- Dedicated runtime drivers: `@arkstack/driver-express` and `@arkstack/driver-h3`.
- Shared console base commands in `@arkstack/console`: `route:list`, `make:controller`, `make:resource`, `make:full-resource`, `dev`, `build`.
- Lean starter profiles in scaffolding: `express-lean` and `h3-lean`.
- Root-level tests for shared command surface and integration behavior.

### Changed

- Moved duplicated console logic from kit-local implementations into shared console package architecture.
- Standardized router contract usage for route binding/listing across runtimes.
- Lean kit generation now strips app/api/database scaffolding by removing `src/app`, `src/routes/api.ts`, Prisma/database files, and DB dependencies.
- Added root script `publish:packages` to publish `@arkstack/*` packages.

### Docs

- Expanded docs landing page, getting started guide, architecture overview, API reference, and roadmap content.

## [0.2.0] - 2026-03-09

### Added

- Add support for Arkormˣ in controllers and services, removing direct Prisma client usage.
- Framework-agnostic shared packages: `@arkstack/contract`, `@arkstack/common`, `@arkstack/console`
- Dedicated runtime drivers: `@arkstack/driver-express` and `@arkstack/driver-h3`.
- Shared console base commands in `@arkstack/console`: `route:list`, `make:controller`, `make:resource`, `make:full-resource`, `dev`, `build`.
- Lean starter profiles in scaffolding: `express-lean` and `h3-lean`.
- Root-level tests for shared command surface and integration behavior.

### Changed

- Reorganize console command discovery paths and middleware imports
- Moved duplicated console logic from kit-local implementations into shared console package architecture.
- Standardized router contract usage for route binding/listing across runtimes.
- Lean kit generation now strips app/api/database scaffolding by removing `src/app`, `src/routes/api.ts`, Prisma/database files, and DB dependencies.
- Added root script `publish:packages` to publish `@arkstack/*` packages.
- Remove direct prisma client usage from controllers and services, encouraging use of Arkormˣ models instead.

### Docs

- Expanded docs landing page, getting started guide, architecture overview, API reference, and roadmap content.
- Enhance documentation with CLI and database modeling guides

## [0.1.1] - 2026-02-20

- Refactored the validator utility to improve type safety and error handling.
- Added changelog to document recent changes.

## [0.1.0] - 2026-02-19

- Updated controller model stubs to use the new Resource class from 'resora' for handling JSON responses.
- Removed deprecated resource collection and resource stubs.
- Deleted passport-related files and dependencies as they are no longer needed.
- Updated middleware configuration for H3 and Express to include CORS and method override.
- Introduced a new router implementation for Express and H3 using 'clear-router'.
- Added new types for middleware configuration to enhance type safety.
- Created new database connection setup using Prisma with PostgreSQL adapter.
- Added new controller API resource stub for handling CRUD operations with resora.

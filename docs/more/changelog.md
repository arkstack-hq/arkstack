# Changelog

All notable Arkstack changes are documented in this file.

The format follows semantic versioning principles.

## [Unreleased]

No unreleased changes are documented yet.

## [0.17.2] - 2026-07-14

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

- Restored the missing changelog history from `0.4.1` through `0.17.1`.

## [0.17.0 - 0.17.1] - 2026-07-09

Released versions: `0.17.0`, `0.17.1`.

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
- Made console builds recover from stale `.arkstack/build` output and ensured config is ready before tsdown runs.
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

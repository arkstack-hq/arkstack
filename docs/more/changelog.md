# Changelog

All notable Arkstack changes are documented in this file.

The format follows semantic versioning principles.

## [Unreleased] - Upcoming features and changes that are currently in development or planned for the next release.

### Added

- Added `APP_HOST` (with `HOST` fallback) to override the server bind host in the Express and H3 drivers, defaulting to `0.0.0.0` so the app is reachable on all network interfaces.

### Changed

- Prefer the platform-provided `PORT` env variable over `APP_PORT` when resolving the server port, so deployments on Railway, Heroku, and similar platforms bind to the expected port automatically.

### Docs

- Documented host and port binding for the Express and H3 runtimes, including Railway deployment guidance.

### Fixed

- Fixed deployments where the server bound to `localhost` and platform healthcheck proxies (e.g. Railway) could not reach the app.

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

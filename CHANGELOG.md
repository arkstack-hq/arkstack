# Changelog

All notable Arkstack changes are documented in this file.

The format follows semantic versioning principles.

## [Unreleased] - Upcoming features and changes that are currently in development or planned for the next release.

### Added

- Added `@arkstack/auth` with JWT-based login, personal access tokens, current-session helpers, temporary tokens, and auth exceptions.
- Added `@arkstack/http` with framework-neutral request and response wrappers.
- Added Express and H3 auth middleware through `@arkstack/driver-express/middlewares` and `@arkstack/driver-h3/middlewares`.
- Added `User` and `PersonalAccessToken` app models to the Express and H3 templates.
- Added auth and HTTP tests across shared packages, runtime drivers, and full templates.
- Added `migrate:fresh` command support to console packages.

### Changed

- Replaced common `error-handling` utilities with the class-based `ErrorHandler` while preserving named helper exports.
- Updated `getModel()` to support typed model registries, explicit model constructor typing, and abstract constructors.
- Updated Express and H3 error handling to use shared error payload utilities.
- Updated lean scaffolding to remove Arkorm/database model files and dependencies more completely.
- Updated CI, docs deploy, and publish workflows to install with `pnpm install --frozen-lockfile`.

### Docs

- Added authentication and HTTP guides.
- Documented auth middleware, shared auth APIs, HTTP wrappers, `ErrorHandler`, and typed `getModel()`.

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

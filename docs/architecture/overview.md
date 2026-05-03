# Architecture Overview

Arkstack separates framework specifics from application structure by using shared contracts and runtime drivers.

## Core Idea

- Keep app architecture consistent across frameworks.
- Isolate framework details inside driver packages.
- Reuse console/runtime logic through shared packages.

## Shared Packages

### `@arkstack/contract`

Defines framework-agnostic contracts for:

- kit drivers
- router capabilities
- app + runtime integration boundaries

### `@arkstack/common`

Provides reusable runtime helpers, including lifecycle utilities, typed model resolution, hashing/encryption helpers, and the shared `ErrorHandler`.

### `@arkstack/http`

Provides framework-neutral request and response wrappers for shared packages that need request data without importing Express, H3, or another runtime.

### `@arkstack/auth`

Provides framework-neutral authentication services, user/session contracts, personal access token support, and current-session helpers.

### `@arkstack/console`

Provides a shared console kernel and base commands used by all kits.

## Driver Packages

Each runtime implements the contract through a dedicated driver package:

- `@arkstack/driver-express`
- `@arkstack/driver-h3`

This keeps runtime-specific behavior in one place while preserving a uniform app structure. Framework integrations such as auth middleware live in the driver packages so Express routes receive authenticated request properties and H3 routes receive authenticated event context.

## Console Command Model

Arkstack centralizes common developer commands in `@arkstack/console` and allows framework-specific extensions via driver stubs.

## Template Profiles

### Full Profiles

- Includes Arkormˣ/database features.
- Includes generated app resources and API route scaffolding.

### Lean Profiles

- Removes Arkormˣ/database dependencies and runtime files.
- Removes `src/app` and `src/routes/api.ts` for a minimal baseline.

## Why This Matters

- Easier migration between frameworks.
- Less duplicated maintenance across kits.
- Cleaner evolution path for future drivers (Fastify, Bun, and others).

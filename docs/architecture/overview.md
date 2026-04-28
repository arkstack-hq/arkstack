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

Provides reusable runtime helpers, including lifecycle and error response utilities.

### `@arkstack/console`

Provides a shared console kernel and base commands used by all kits.

## Driver Packages

Each runtime implements the contract through a dedicated driver package:

- `@arkstack/driver-express`
- `@arkstack/driver-h3`

This keeps runtime-specific behavior in one place while preserving a uniform app structure.

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

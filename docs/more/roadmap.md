# Roadmap

This roadmap tracks Arkstack progress and upcoming priorities.

## Current Status

### Completed

- ✅ Framework-agnostic contracts and shared packages
  - `@arkstack/contract`
  - `@arkstack/common`
  - `@arkstack/console`
- ✅ Driver packages for current runtimes
  - `@arkstack/driver-express`
  - `@arkstack/driver-h3`
  - `@arkstack/driver-fastify`
- ✅ Shared console command surface
  - `route:list`
  - `make:controller`
  - `make:resource`
  - `make:full-resource`
  - `dev`
  - `build`
- ✅ Lean and full starter profiles in create-arkstack
  - `express`, `h3`, `fastify`
  - `express-lean`, `h3-lean`
- ✅ Lean profile stripping of app/api/database scaffolding
  - Removes `src/app`
  - Removes `src/routes/api.ts`
  - Removes Prisma and database runtime/dependencies
- ✅ Root-level test coverage for shared architecture and command surface
- ✅ [Package versioning and release workflow guidance](/more/releases)
- ✅ [Upgrade guides between template versions](/guide/upgrading)

### In Progress

- 🔄 Documentation expansion and API reference hardening

## Next Priorities

1. 🔲 Add a plugin/extension model for driver and console integration
2. 🔲 Ship richer end-to-end command and scaffolding tests

## Future

- Bun runtime driver
- Optional auth presets
- Optional validation abstraction presets
- Multi-runtime starter comparison matrix

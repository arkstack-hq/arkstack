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
- ✅ Plugin model for driver and console integration
  - `ArkstackPlugin` and the `Plugins` registry in `@arkstack/foundry`
  - `driver.prepare()` and the `driver:prepare` hook
  - Plugin commands in `ark`

### In Progress

- 🔄 Documentation expansion and API reference hardening

## Next Priorities

1. 🔲 Ship richer end-to-end command and scaffolding tests
2. 🔲 Publish package-level versioning/release workflow guidance
3. 🔲 Add migration and upgrade guides between template versions

## Future

- Bun runtime driver
- Optional auth presets
- Optional validation abstraction presets
- Multi-runtime starter comparison matrix

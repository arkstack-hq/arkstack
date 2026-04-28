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

Driver packages:

- `@arkstack/driver-express`
- `@arkstack/driver-h3`

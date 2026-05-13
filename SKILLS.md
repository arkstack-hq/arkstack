# Arkstack Scaffold Agent Skills

This file is for AI agents working inside an application created with `pnpm create arkstack`, `npm init arkstack`, `yarn create arkstack`, or `npx create-arkstack`.

Assume the agent is in a scaffolded Arkstack project, not in the Arkstack framework monorepo. The project normally contains one runtime template, either Express or H3, plus any files the user has added.

## First Checks

Before changing code:

- Read the local `package.json`.
- Detect the package manager from lockfiles:
  - `pnpm-lock.yaml`: use `pnpm`.
  - `package-lock.json`: use `npm`.
  - `yarn.lock`: use `yarn`.
  - `bun.lock` or `bun.lockb`: use Bun only if the project already uses Bun.
- Detect the runtime driver from dependencies and imports:
  - `@arkstack/driver-express`: Express runtime.
  - `@arkstack/driver-h3`: H3 runtime.
- Detect project scope:
  - Full project: has `src/app`, `src/database`, `src/routes/api.ts`, `arkormx.config.ts`, and database/auth dependencies.
  - Lean project: usually lacks `src/app`, `src/database`, `src/routes/api.ts`, `arkormx.config.ts`, and database/auth dependencies.
- Inspect nearby files before introducing a new pattern.

## Package Scripts

Use the package manager already used by the project.

Common scripts in scaffolded apps:

- `dev`: runs `ark dev`.
- `build`: runs `ark build`.
- `lint`: runs ESLint.
- `lint:fix`: runs ESLint with fixes.
- `test`: runs Vitest.
- `test:watch`: runs Vitest in watch mode.
- `postinstall`: runs `prepare`.

Examples:

```sh
pnpm dev
pnpm build
pnpm test
pnpm lint
```

With npm:

```sh
npm run dev
npm run build
npm run test
npm run lint
```

## Ark CLI

The Arkstack CLI is exposed by the installed `ark` binary from `@arkstack/console`.

Use whichever form works for the local package manager:

```sh
pnpm ark --help
pnpm ark <command> --help
pnpm ark route:list
```

With npm:

```sh
npm exec ark -- --help
npm exec ark -- <command> --help
npm exec ark -- route:list
```

If local project documentation already uses `npx ark`, that is also acceptable.

## Scaffolded Files

Common files in generated apps:

- `src/server.ts`: server entrypoint.
- `src/core/bootstrap.ts`: framework setup, validation plugins, views, and application instance.
- `src/core/app.ts`: runtime driver, middleware application, route binding, error handling, and shutdown.
- `src/routes/web.ts`: web routes.
- `src/routes/api.ts`: API routes in full templates.
- `src/config/middleware.ts`: middleware registration.
- `src/resources/views`: Edge view templates.
- `src/types/config.ts`: typed configuration helpers.

Full templates also include:

- `src/app/http/controllers`: controllers.
- `src/app/http/resources`: API resources and collections.
- `src/app/http/middlewares`: app middleware.
- `src/app/models`: application models.
- `src/app/console/commands`: custom console commands.
- `src/database/migrations`: migrations.
- `src/database/factories`: factories.
- `src/database/seeders`: seeders.
- `src/config/filesystem.ts`: filesystem configuration.
- `src/config/notifications.ts`: notification configuration.
- `arkormx.config.ts`: Arkormx configuration.

Lean templates intentionally omit most full-stack application and database files. Do not assume full-template directories exist.

## Route Inspection

Use `ark route:list` to inspect registered routes when the app can boot.

Useful options:

- `--path <value>` or `-p <value>`: filter by route path.
- `--method <value>` or `-m <value>`: filter by HTTP method.

Run route inspection after changing route files, controllers, or route-related middleware.

## Route Editing

Use the runtime-specific router import already present in the project:

- Express apps import `Router` from `@arkstack/driver-express`.
- H3 apps import `Router` from `@arkstack/driver-h3`.

Default route locations:

- `src/routes/web.ts` for web/view routes.
- `src/routes/api.ts` for API routes in full templates.

In full templates, API routes commonly map to controllers, for example `Router.apiResource('/users', UserController)`.

In lean templates, add routes to `src/routes/web.ts` unless the user asks you to introduce a fuller API structure.

## Controller Generation

Full templates can generate controllers:

```sh
pnpm ark make:controller User
pnpm ark make:controller User --api
```

Useful options:

- `--api`: generate an API-style controller.
- `--model <Name>` or `-m <Name>`: attach model context and create the model if needed.
- `--factory` or `-f`: create a linked factory when using `--model`.
- `--seeder` or `-s`: create a linked seeder when using `--model`.
- `--migration` or `-x`: create a linked migration when using `--model`.
- `--force`: overwrite an existing generated controller.

Use this only when `src/app/http/controllers` exists or when the user explicitly wants to add the full app structure.

## Resource Generation

Full templates can generate Resora resources in `src/app/http/resources`:

```sh
pnpm ark make:resource resource User
pnpm ark make:resource collection UserCollection
pnpm ark make:resource all User
```

Use `make:full-resource` to create a resource, collection, and API controller together:

```sh
pnpm ark make:full-resource User --model User
```

Useful options:

- `--model <Name>` or `-m <Name>`: attach model context.
- `--factory` or `-f`: create a linked factory.
- `--seeder` or `-s`: create a linked seeder.
- `--migration` or `-x`: create a linked migration.
- `--force`: overwrite generated files.

Before using resource generators, confirm `resora.config.js` exists and points to the expected stubs and resources directory.

## Database and Modeling

Use database commands only in full templates with `@arkstack/database`, `arkormx`, and `arkormx.config.ts`.

Common commands:

```sh
pnpm ark make:model User
pnpm ark make:migration create_posts_table
pnpm ark make:factory User
pnpm ark make:seeder User
pnpm ark migrate
pnpm ark models:sync
pnpm ark seed
```

Potentially destructive commands require explicit user approval:

```sh
pnpm ark migrate:fresh
pnpm ark migrate:rollback
```

Conventions:

- Models live in `src/app/models`.
- Migrations live in `src/database/migrations`.
- Factories live in `src/database/factories`.
- Seeders live in `src/database/seeders`.
- Database connection settings come from `.env`, usually `DATABASE_URL`.

## View Generation

If `@arkstack/view` is installed, generate Edge views with:

```sh
pnpm ark make:view dashboard
pnpm ark make:view admin/users/index
```

Views live in `src/resources/views` and use the `.edge` extension. Dots and slashes in the view name may create nested paths.

Use `--force` only when intentionally replacing an existing view.

## Custom Console Commands

Full templates include `src/app/console/commands`.

Generate a command with:

```sh
pnpm ark make:command SendReport
```

Then edit the generated command class, signature, description, and `handle` method.

Do not assume custom commands exist in lean templates unless the user has added the directory.

## Middleware

Middleware is configured through `src/config/middleware.ts`.

Runtime-specific middleware imports differ:

- Express apps use `@arkstack/driver-express/middlewares`.
- H3 apps use `@arkstack/driver-h3/middlewares`.

Add app-specific middleware under `src/app/http/middlewares` in full templates. In lean templates, keep middleware small inside config or create a local directory only if the task justifies it.

## Filesystem and Notifications

Full templates may include:

- `src/config/filesystem.ts`
- `src/config/notifications.ts`
- `@arkstack/filesystem`
- `@arkstack/notifications`

Use these only when the dependencies and config files exist.

If filesystem links are configured, the CLI may expose:

```sh
pnpm ark storage:link
```

Ask before using:

```sh
pnpm ark storage:link --force
```

## File Editing Rules

- Prefer CLI generators for new Arkstack primitives when the relevant template structure exists.
- Edit generated files after generation rather than recreating stubs by hand.
- Keep runtime-specific code near `src/core`, `src/config/middleware.ts`, route files, or driver-specific middleware.
- Keep business logic out of route closures once it grows; use services or focused modules.
- Do not edit generated output directories such as `dist`, `.arkstack/build`, coverage folders, or `node_modules`.
- Keep `.env.example` updated when adding required environment variables.

## Verification

Choose the smallest useful verification:

- Route changes: run `ark route:list` if the app can boot.
- Behavior changes: run `test`.
- Type/build-sensitive changes: run `build`.
- Formatting/lint-sensitive changes: run `lint`.
- Database changes: inspect migration files, then run migrations only after confirming the target database is safe.

Use the local package manager for scripts and the local `ark` binary for CLI commands.

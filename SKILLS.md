# Arkstack Agent Skills

This file describes discrete capabilities an AI agent can call when working inside an Arkstack project. It is intended to be provided as project context to tools such as Claude, Codex, Cursor, and other coding agents.

Agents should prefer the project's package manager scripts and the `ark` CLI over hand-written file scaffolding when a first-party command exists.

## Environment Discovery

- Identify the package manager from lockfiles: prefer `pnpm` when `pnpm-lock.yaml` is present.
- Inspect `package.json` scripts before running commands.
- Detect the runtime driver from dependencies: `@arkstack/driver-h3` for H3, `@arkstack/driver-express` for Express.
- Detect full vs lean templates by checking for database files, Arkormx dependencies, and `src/app` structure.
- Read `.env`, `.env.example`, `arkormx.config.ts`, `tsdown.config.ts`, and route files only as needed for the task.

## Project Commands

Use these commands from the Arkstack project root when available:

- `pnpm dev` or `pnpm ark dev`: run the development server through `tsdown` in development mode.
- `pnpm build` or `pnpm ark build`: build the application for production.
- `pnpm test`: run the Vitest test suite.
- `pnpm test:watch`: run Vitest in watch mode.
- `pnpm lint`: run ESLint checks.
- `pnpm lint:fix`: apply ESLint fixes.
- `pnpm ark --help`: list available console commands.
- `pnpm ark <command> --help`: inspect command options before generating or mutating files.

In this monorepo, additional root commands exist:

- `pnpm build:packages`: build all `@arkstack/*` packages.
- `pnpm test:coverage`: run tests with coverage.
- `pnpm docs:dev`: run VitePress documentation locally.
- `pnpm docs:build`: build the documentation site.
- `pnpm docs:preview`: preview the built documentation.

## Route Inspection

Use `pnpm ark route:list` to list registered routes.

Useful options:

- `--path <value>` or `-p <value>`: filter by route path.
- `--method <value>` or `-m <value>`: filter by HTTP method.

Use this before changing controllers, middleware, or route definitions so the agent can verify the effective route table.

## Controller Generation

Use `pnpm ark make:controller <Name>` to create a controller in `src/app/http/controllers`.

Useful options:

- `--api`: generate an API-style controller.
- `--model <Name>` or `-m <Name>`: attach model context and create the model if needed.
- `--factory` or `-f`: create a linked factory when using `--model`.
- `--seeder` or `-s`: create a linked seeder when using `--model`.
- `--migration` or `-x`: create a linked migration when using `--model`.
- `--force`: overwrite an existing generated controller.

Prefer this command over manually copying controller stubs. Generated controllers use driver-specific stubs from `node_modules/@arkstack/driver-<driver>/stubs` or the local `stubs` directory.

## Resource Generation

Use `pnpm ark make:resource <type> <Name>` to generate response resources through Resora.

Common forms:

- `pnpm ark make:resource resource User`
- `pnpm ark make:resource collection UserCollection`
- `pnpm ark make:resource all User`

Use `pnpm ark make:full-resource <Prefix>` to create a resource, collection, and API controller together.

Useful options for `make:full-resource`:

- `--model <Name>` or `-m <Name>`: attach model context.
- `--factory` or `-f`: create a linked factory.
- `--seeder` or `-s`: create a linked seeder.
- `--migration` or `-x`: create a linked migration.
- `--force`: overwrite generated resource/controller files.

## Database and Modeling

Full Arkstack templates use Arkormx through the Arkstack CLI.

Available database skills:

- `pnpm ark make:model <Name>`: create a model.
- `pnpm ark make:migration <name>`: create a migration.
- `pnpm ark make:factory <Name>`: create a model factory.
- `pnpm ark make:seeder <Name>`: create a seeder.
- `pnpm ark migrate`: run pending migrations.
- `pnpm ark migrate:fresh`: rebuild the database from scratch. Ask for explicit user approval before running because it is destructive.
- `pnpm ark migrate:rollback`: roll back migrations. Ask for approval before running against non-local data.
- `pnpm ark migrate:history`: inspect migration history.
- `pnpm ark models:sync`: sync model files with the database schema.
- `pnpm ark seed`: run seeders.

Conventions:

- Models belong in `src/app/models` in scaffolded apps.
- Migrations belong in `src/database/migrations`.
- Factories belong in `src/database/factories`.
- Seeders belong in `src/database/seeders`.
- Use `arkormx.config.ts` for database build output and schema configuration.

## View Generation

Use `pnpm ark make:view <name>` to create an Edge view in `src/resources/views`.

Conventions:

- Dots and slashes become nested view paths.
- `.edge` is appended automatically.
- Use `--force` only when intentionally replacing an existing view.

## Storage Links

Use `pnpm ark storage:link` when the filesystem package is installed and the app defines `filesystem.links`.

Useful option:

- `--force`: remove existing links before creating new ones. Ask for confirmation before using this on an existing project.

## Custom Console Commands

Use `pnpm ark make:command <Name>` to create a command class in `src/app/console/commands`.

Conventions:

- Generated command class names end with `Command`.
- Generated command signatures default to `app:<lowercase-command-name>`.
- Custom commands are auto-discovered by the console kernel.

## File Editing Skills

Agents can safely edit these common Arkstack areas when the task calls for it:

- `src/routes`: route registration.
- `src/app/http/controllers`: HTTP controllers.
- `src/app/http/middlewares`: middleware.
- `src/app/http/resources`: resource and collection response shaping.
- `src/app/models`: application models.
- `src/app/services`: business logic.
- `src/app/console/commands`: custom commands.
- `src/database/migrations`: database migrations.
- `src/database/factories`: test or seed factories.
- `src/database/seeders`: seed data.
- `src/resources/views`: Edge templates.
- `src/config` or `config`: configuration files.
- `tests`: Vitest tests.
- `docs`: VitePress documentation.

Rules:

- Prefer generated files for new Arkstack primitives, then edit the generated result.
- Keep runtime-specific code inside driver, middleware, or bootstrap boundaries.
- Keep business logic in services or framework-neutral modules when practical.
- Do not edit generated build output such as `dist`, `.arkstack/build`, or coverage artifacts.

## Testing and Verification

Pick the smallest useful verification for the change:

- Run `pnpm test` after behavior changes.
- Run targeted Vitest files when the project supports them.
- Run `pnpm lint` after broad TypeScript or formatting changes.
- Run `pnpm build` after package exports, runtime entrypoints, CLI commands, or build config changes.
- Run `pnpm docs:build` after VitePress docs or sidebar changes.
- Run `pnpm ark route:list` after route/controller/middleware changes.

## Safety Rules

- Ask before running destructive database commands such as `migrate:fresh`, broad rollback commands, or forced storage links.
- Ask before deleting user files or replacing existing generated files with `--force`.
- Do not commit, publish, or release unless explicitly requested.
- Do not assume a database is disposable unless the user says it is local/test data.
- Preserve project conventions and inspect nearby files before introducing a new pattern.

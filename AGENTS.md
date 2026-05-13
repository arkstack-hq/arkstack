# Arkstack Scaffold Agent Workflows

This file is for AI agents working inside applications scaffolded by Arkstack. It assumes the agent has access to the generated project only, not to the Arkstack framework monorepo.

Read `SKILLS.md` first, then use these workflows to combine the available skills safely.

## Operating Rules

- Start from the scaffolded app root.
- Inspect the local `package.json` before running commands.
- Use the package manager indicated by the lockfile.
- Detect whether the app is Express or H3 before editing routes, middleware, or runtime code.
- Detect whether the app is full or lean before using database, auth, resource, or controller workflows.
- Prefer `ark` generators when the project structure supports them.
- Ask before destructive database, storage, overwrite, delete, publish, or release operations.

## Understand the App

1. Read `package.json`.
2. Check for `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, or Bun lockfiles.
3. Identify the runtime:
   - Express: `@arkstack/driver-express`.
   - H3: `@arkstack/driver-h3`.
4. Identify the scope:
   - Full: has `src/app`, `src/database`, `src/routes/api.ts`, and `arkormx.config.ts`.
   - Lean: lacks those full-template files.
5. Read `src/routes/web.ts`, and read `src/routes/api.ts` if it exists.
6. Read `src/core/app.ts`, `src/core/bootstrap.ts`, and `src/config/middleware.ts` only when runtime behavior matters.

## Add a Simple Web Route

1. Inspect `src/routes/web.ts`.
2. Use the existing runtime driver import for `Router`.
3. Add the route closure or controller mapping.
4. If rendering HTML, use `view()` from `@arkstack/view` and keep templates in `src/resources/views`.
5. Generate a view with `ark make:view <name>` when useful.
6. Verify with the dev server, `ark route:list`, or the existing test suite.

## Add an API Route in a Full Template

1. Confirm `src/routes/api.ts` and `src/app/http/controllers` exist.
2. Inspect nearby controllers and resources.
3. Generate missing primitives:
   - `ark make:controller <Name> --api`
   - `ark make:resource resource <Name>`
   - `ark make:resource collection <Name>Collection`
   - `ark make:full-resource <Name> --model <Model>` for a model-backed resource set.
4. Register the route in `src/routes/api.ts`.
5. Move business logic into a service or focused helper when the controller action becomes more than request orchestration.
6. Add or update tests.
7. Verify with `ark route:list` and the local test command.

## Add an API Route in a Lean Template

1. Confirm the app lacks `src/app` and `src/routes/api.ts`.
2. Do not use controller/resource/model generators unless the user wants to expand the project structure.
3. Add lightweight routes to `src/routes/web.ts`, or create `src/routes/api.ts` only if you also update bootstrap/app route loading as needed.
4. Keep handlers small. Extract reusable behavior into local modules if it grows.
5. Verify with the dev server, `ark route:list`, or tests.

## Add a Database-Backed Feature

Use this only in full templates.

1. Confirm `@arkstack/database`, `arkormx`, `src/database`, and `arkormx.config.ts` exist.
2. Generate persistence files:
   - `ark make:model <Name>`
   - `ark make:migration <migration_name>`
   - `ark make:factory <Name>` when tests or seed data need it.
   - `ark make:seeder <Name>` when reusable seed data is needed.
3. Edit the model, migration, factory, and seeder files.
4. Add controllers, resources, routes, or services as needed.
5. Update `.env.example` when adding database-related configuration.
6. Ask before running migrations against any database that may contain user data.
7. Run `ark models:sync` when schema-derived model types should be refreshed.
8. Verify with tests and route inspection.

## Add Authentication Behavior

Use this only when `@arkstack/auth` and auth models exist.

1. Inspect `src/app/models/User.ts`, `PersonalAccessToken.ts`, and `UserTwoFactor.ts` if present.
2. Inspect auth middleware, route protection, and existing tests.
3. Keep auth persistence changes synchronized across models and migrations.
4. Use environment variables for secrets such as `JWT_SECRET` and keep `.env.example` current.
5. Add tests for login, logout, protected routes, token/session behavior, and error responses.

## Add Notifications

Use this only when `@arkstack/notifications` and `src/config/notifications.ts` exist.

1. Inspect notification config and existing templates.
2. Use configured mail, SMS, or database channels rather than hard-coding providers.
3. Keep provider credentials in environment variables.
4. Update `.env.example` for new required provider settings.
5. Add tests around message formatting and dispatch boundaries.

## Add File Storage

Use this only when `@arkstack/filesystem` and `src/config/filesystem.ts` exist.

1. Inspect filesystem disks and links.
2. Use Arkstack filesystem abstractions instead of direct provider SDK calls when possible.
3. Keep credentials in environment variables.
4. Run `ark storage:link` only when public/local links are required.
5. Ask before running `ark storage:link --force`.
6. Test upload, URL generation, download, and cleanup behavior without assuming remote services are available.

## Add Middleware

1. Inspect `src/config/middleware.ts`.
2. Identify the runtime driver.
3. In a full template, place app-specific middleware under `src/app/http/middlewares` when appropriate.
4. In a lean template, keep middleware local and minimal unless the user wants more structure.
5. Register middleware through the existing middleware config pattern.
6. Add tests when middleware changes auth, request parsing, headers, errors, or response behavior.

## Add a View-Rendered Page

1. Inspect `src/routes/web.ts`.
2. Inspect existing views under `src/resources/views`.
3. Generate the view with `ark make:view <name>` if the command is available.
4. Add or update the route that returns `view('<name>', data)`.
5. Keep reusable data preparation outside the route closure when it grows.
6. Verify in dev mode or with route tests.

## Add a Custom Console Command

Use this in full templates or projects that already have `src/app/console/commands`.

1. Generate the command with `ark make:command <Name>`.
2. Edit the generated signature, description, and `handle` method.
3. Keep command output concise and script-friendly.
4. Add tests when the command mutates files, invokes services, or orchestrates database work.
5. Verify with `ark --help` or `ark <signature> --help`.

## Debug a Failing Scaffolded App

1. Reproduce the failure with the smallest local script, command, or test.
2. Check `.env` and `.env.example` for missing values.
3. Inspect route files and run `ark route:list` for routing issues.
4. Inspect `src/core/bootstrap.ts` for setup issues.
5. Inspect `src/config/middleware.ts` for request parsing, CORS, logging, or auth issues.
6. For database issues, inspect `arkormx.config.ts`, migration files, and model files before running any migration command.
7. Fix the smallest owning layer.
8. Re-run the failing command and one adjacent verification.

## Keep the Project Agent-Friendly

- Keep `package.json` scripts accurate.
- Keep `.env.example` current.
- Keep generated Arkstack files in conventional directories.
- Document custom route loading, custom stubs, or unusual bootstrap logic.
- Add tests near the behavior they verify.
- Keep runtime-specific logic near routes, middleware, driver setup, or bootstrap.
- Move growing business logic out of route closures and controller methods.
- Avoid committing generated output, local logs, credentials, or dependency folders.

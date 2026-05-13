# Arkstack Agent Workflows

This file describes higher-order workflows for AI agents working inside Arkstack projects. It composes the lower-level capabilities documented in `SKILLS.md`.

Agents should read `SKILLS.md` first, then use this file to plan multi-step work.

## Operating Principles

- Work from the project root.
- Inspect `package.json`, lockfiles, runtime dependencies, route files, and nearby source before changing code.
- Prefer Arkstack CLI generators for controllers, resources, models, migrations, views, and commands.
- Keep application logic runtime-agnostic unless the task is specifically about Express, H3, or another driver.
- Verify with the narrowest command that gives useful confidence.
- Ask before destructive operations.

## Add an API Endpoint

1. Inspect existing routes under `src/routes`.
2. Run `pnpm ark route:list` if the app can boot.
3. Generate missing pieces:
   - `pnpm ark make:controller <Name> --api`
   - `pnpm ark make:resource resource <Name>` when shaping a single response.
   - `pnpm ark make:resource collection <Name>Collection` when returning lists.
   - `pnpm ark make:full-resource <Name> --model <Model>` for a complete CRUD-style surface.
4. Register or update routes in the appropriate route file.
5. Put business logic in services or framework-neutral modules when the endpoint is not trivial.
6. Add or update tests.
7. Verify with `pnpm test` and `pnpm ark route:list`.

## Add a Database-Backed Feature

1. Confirm the project is a full template with Arkormx/database support.
2. Generate model and persistence files:
   - `pnpm ark make:model <Name>`
   - `pnpm ark make:migration <migration_name>`
   - `pnpm ark make:factory <Name>` when tests or seed data need it.
   - `pnpm ark make:seeder <Name>` when reusable seed data is needed.
3. Edit the migration and model fields.
4. Add controllers, resources, services, or routes as needed.
5. Run migrations only after confirming the target database is safe.
6. Run `pnpm ark models:sync` when schema-derived model typing should be refreshed.
7. Verify with tests and route inspection.

## Add a View-Rendered Page

1. Inspect existing routes and view naming conventions.
2. Generate the view with `pnpm ark make:view <path-or-name>`.
3. Add or update the controller action that renders the view.
4. Register the route.
5. Keep reusable view data preparation in services or helpers when it grows beyond a simple action.
6. Verify the route list and run tests if the project has HTTP coverage.

## Add Middleware

1. Inspect existing middleware in `src/app/http/middlewares`.
2. Decide whether the middleware is runtime-agnostic or driver-specific.
3. Implement the middleware using the existing driver conventions.
4. Register it where routes or runtime bootstrap expect middleware.
5. Run `pnpm ark route:list` when route-level middleware changes route behavior.
6. Add tests for auth, request mutation, error handling, or response behavior.

## Work on Authentication

1. Inspect the app models for `User`, `PersonalAccessToken`, and two-factor models if present.
2. Inspect auth config, middleware, and existing tests before changing behavior.
3. Keep session/device behavior aligned with `@arkstack/auth` conventions.
4. Update database migrations and models together when auth persistence changes.
5. Add tests for login, logout, protected routes, token/session behavior, and error responses.

## Work on Notifications

1. Inspect notification classes, drivers, and templates.
2. Use the notification module's channel abstractions for mail, SMS, or database notifications.
3. Keep mail templates under the existing view/resource convention.
4. Use config/env values for provider credentials rather than hard-coding secrets.
5. Add tests around notification formatting and driver dispatch boundaries.

## Work on Filesystem Features

1. Inspect filesystem configuration before writing storage code.
2. Use the `@arkstack/filesystem` API instead of direct provider SDK calls when possible.
3. Run `pnpm ark storage:link` only when links are required.
4. Ask before using `pnpm ark storage:link --force`.
5. Test upload, download, URL, and cleanup behavior without assuming a remote provider is available.

## Add a Custom CLI Command

1. Generate the command with `pnpm ark make:command <Name>`.
2. Edit the generated signature, description, and `handle` method.
3. Keep command output concise and script-friendly.
4. Add tests when the command mutates files, invokes app services, or orchestrates database work.
5. Verify with `pnpm ark --help` or `pnpm ark <signature> --help`.

## Update Documentation

1. Edit VitePress pages under `docs`.
2. Add new guide pages to `docs/.vitepress/config.ts` when they should appear in navigation.
3. Use concise examples that match the current CLI and folder structure.
4. Run `pnpm docs:build` after sidebar, frontmatter, or markdown changes.

## Upgrade or Refactor a Package

1. Inspect package exports in the relevant `packages/*/package.json`.
2. Inspect local tests for the package.
3. Keep public exports backward-compatible unless a breaking change is requested.
4. Update package README files when public behavior changes.
5. Run package tests, then root tests or builds when shared contracts are touched.

## Debug a Failing App

1. Reproduce with the failing script or the smallest relevant test.
2. Check recent changes, route registration, environment variables, and generated build output paths.
3. Use `pnpm ark route:list` for HTTP routing issues.
4. Use migration history and model sync commands for database shape issues.
5. Fix the smallest layer that owns the behavior.
6. Re-run the failing command and one adjacent verification.

## Keep Projects Agent-Friendly

- Keep `package.json` scripts accurate and runnable.
- Keep generated Arkstack primitives in their conventional directories.
- Add tests near the behavior they verify.
- Document custom commands, non-standard stubs, and unusual environment requirements.
- Keep `.env.example` current when adding config.
- Avoid mixing runtime-specific logic into services or models.
- Prefer small, named services over large controller methods when behavior grows.

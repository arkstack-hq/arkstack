# Upgrading

An Arkstack application has two parts that age differently. The `@arkstack/*` packages are ordinary npm dependencies you can update. The files `create-arkstack` copied from a starter template (`src/core`, `src/config`, `src/routes` and so on) now belong to your project, and an update to the packages doesn't touch them. Upgrading means updating the packages and then bringing over the template changes your app needs.

Each release has one version number for every `@arkstack/*` package and every template. See [Versioning and Releases](/more/releases) for how versions are chosen.

## Find your current version

Your Arkstack version is the version of the `@arkstack/*` packages in `package.json`:

```json
{
  "dependencies": {
    "@arkstack/common": "^0.21.0",
    "@arkstack/driver-express": "^0.21.0"
  }
}
```

The installed version is in `node_modules/@arkstack/common/package.json`.

## Upgrade steps

1. Read the release notes for every version between yours and the target in the [changelog](/more/changelog), and the matching sections in [Version notes](#version-notes) below.
2. Update every `@arkstack/*` package to the same version. Mixing versions is not supported.

   ::: code-group

   ```sh [pnpm]
   pnpm up "@arkstack/*@^0.22.0"
   ```

   ```sh [npm]
   npm i @arkstack/common@^0.22.0 @arkstack/console@^0.22.0 # ...every @arkstack package you use
   ```

   ```sh [yarn]
   yarn up "@arkstack/*@^0.22.0"
   ```

   :::

3. Update the companion libraries the release was tested with. Their versions are in the `catalog` section of [`pnpm-workspace.yaml`](https://github.com/arkstack-hq/arkstack/blob/main/pnpm-workspace.yaml) at the release tag: resora, kanun, arkormx, clear-router, parasito and your runtime (express, h3 or fastify).
4. Compare the template at your old and new versions (see below) and copy over the changes your app needs.
5. Publish any new stubs or migrations the release added with `pnpm ark publish --list`, then run your migrations.
6. Run your type check, tests and a production build.

Upgrade one minor version at a time when you are several versions behind. Breaking changes only land in minor releases, and each one has notes below.

## Comparing template versions

Every release is tagged in the [arkstack repository](https://github.com/arkstack-hq/arkstack/tags) by its version, without a `v` prefix. The templates live in `templates/express`, `templates/h3` and `templates/fastify`.

Download both versions of your template and compare them:

```sh
npx giget gh:arkstack-hq/arkstack/templates/express#0.21.0 .upgrade/old
npx giget gh:arkstack-hq/arkstack/templates/express#0.22.0 .upgrade/new
diff -ru .upgrade/old .upgrade/new
```

Or, in a clone of the repository:

```sh
git diff 0.21.0 0.22.0 -- templates/express
```

A few things to keep in mind when reading the diff:

- The template's `package.json` uses `workspace:^` and `catalog:` versions. Use the versions from step 2 and 3 instead.
- Lean projects don't have the database, API and auth files that `create-arkstack` removes, so skip changes to them.
- Inertia files come from `packages/inertia/stubs`. Compare that folder for changes to the Inertia setup.
- Formatting-only changes, like the move to Prettier in 0.20.0, can be ignored.

## Version notes

These notes cover what an existing application has to do. New features that need no change are in the [changelog](/more/changelog).

### 0.21 to 0.22

No changes are needed for Express and H3 apps.

- Fastify is a new runtime with its own template. There is no migration path from Express or H3 to Fastify; see [Fastify Runtime](/guide/fastify-runtime) to start one.
- Update resora to `^1.3.36`, `@resora/plugin-clear-router` to `^1.0.73` and clear-router to `^2.9.4`.
- Since resora 1.3.35 (Arkstack 0.21.1), resora's CLI is imported from `resora/cli`, and `@h3ravel/musket` is an optional peer dependency. Templates already list musket. If your code imported `CliApp`, `MakeResource` or `InitCommand` from `resora`, import them from `resora/cli`.

### 0.20 to 0.21

0.21 adds [localization](/guide/localization) with `@arkstack/lang`. To use it:

1. Install `@arkstack/lang`.
2. Register its helpers in `src/core/bootstrap.ts`:

   ```ts
   import '@arkstack/lang/setup'
   ```

3. Add the locale middleware to the `before` list in `src/config/middleware.ts`. Use `localeMiddleware()` on Express and `h3LocaleMiddleware()` on H3, both from `@arkstack/lang`.
4. Add your translations under `src/lang/{locale}`, starting with `src/lang/en/messages.ts`.

### 0.19 to 0.20

- `Hook.set()`, `Hook.unset()`, `Hook.getAll()` and calling a hook through `Hook.get(name, pos, ...args)` are deprecated. Use `Hook.on()`, `Hook.off()`, `Hook.all()` and `Hook.emit()`. The old names still work.
- `@arkstack/common` now re-exports `Hook` from `@arkstack/foundry`. If you declare typed hook names by augmenting `HookRegistry`, augment `@arkstack/foundry`; an augmentation of `@arkstack/common` no longer has any effect.
- On H3, remove the `// @ts-expect-error` above `applyMiddleware()` in `src/core/app.ts`. Config types no longer need it since 0.19.1, and TypeScript reports the unused directive.
- The templates are formatted with Prettier. Reformatting your app is optional.

### 0.18 to 0.19

- `src/config/notifications.ts` gained settings for the new realtime transports: `realtime.push`, the Firebase `web` block, the `firebase-database` transport and the `polling` transport. Copy the parts you use from the template.
- `UserNotificationCenter.send()` and `Notification.db().broadcast()` now broadcast on the user's channel instead of their push tokens. Apps on the `firebase` transport still reach devices, because device push stays on unless `drivers.realtime.push` is `false`.
- On H3, import `H3Middleware` from `@arkstack/driver-h3/types` in `src/core/app.ts`.
- Since 0.18.9, `env()` returns a number only when the value reads exactly as that number. Values such as `'0x1f'`, `'007'` or `'1e5'` are now returned as strings. Convert them yourself if your config relied on the old behaviour.

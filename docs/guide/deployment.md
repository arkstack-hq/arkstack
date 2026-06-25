# Deployment

Arkstack applications are written in TypeScript under `src/` and compiled to plain JavaScript for production. This guide covers how the framework locates your application's modules at runtime so a production deploy can ship **only the build output** — no `src/`, no on-the-fly TypeScript.

## Build output

Running the build compiles `src/` into the output directory, **stripping the leading `src/` segment**:

```
src/app/models/User.ts   ->   dist/app/models/User.js
src/routes/api.ts        ->   dist/routes/api.js
src/config/app.ts        ->   dist/config/app.js
```

The output directory depends on `NODE_ENV`:

| Environment            | `NODE_ENV`    | Output directory   | Override          |
| ---------------------- | ------------- | ------------------ | ----------------- |
| Production             | `production`  | `dist`             | `OUTPUT_DIR`      |
| Development            | anything else | `.arkstack/build`  | `OUTPUT_DIR_DEV`  |

::: warning Set `NODE_ENV=production`
In production you must set `NODE_ENV=production`. The framework keys configuration loading and module resolution off it; without it, Arkstack assumes development and looks for the dev build directory.
:::

## How modules are resolved

In development, application modules (models, route groups, console commands) are loaded straight from TypeScript source — edits are picked up without a rebuild. In production, the source tree is absent, so the same modules are resolved from the build output instead.

This is automatic. The framework resolves each module by trying both locations and preferring the one that matches the environment:

- **Production** → the compiled file in the output directory (`dist`), e.g. `dist/app/models/User.js`.
- **Development** → the TypeScript source, e.g. `src/app/models/User.ts`.

It applies to:

- **Models** loaded via `getModel()`.
- **Route groups** (`routes/api`, `routes/web`).
- **Console commands** discovered from `app/console/commands`.

If you write your own loaders for application files, use the resolution helpers below so they behave correctly in production too.

## Resolution helpers

All three are exported from `@arkstack/common`.

### `resolveRuntimeModule(sourcePath)`

Resolve an application module's **source path** to a file that can be imported at runtime. Production prefers the compiled output; development prefers source. The leading `src/` segment is remapped to the output directory and the correct extension is chosen (`.ts` source → `.js` output). Returns the absolute source path when nothing exists, so a missing module fails with a clear error.

```ts
import { resolveRuntimeModule, importFile } from '@arkstack/common';

// dev  -> <root>/src/app/models/User.ts
// prod -> <root>/dist/app/models/User.js
const path = resolveRuntimeModule('src/app/models/User');
const module = await importFile(path);
```

### `resolveRuntimeDir(sourcePath)`

The directory counterpart of `resolveRuntimeModule`: maps a **source directory** to its build-output location without any file-extension handling. Returns the absolute source directory when neither exists.

```ts
import { resolveRuntimeDir } from '@arkstack/common';

// dev  -> <root>/src/routes
// prod -> <root>/dist/routes
const dir = resolveRuntimeDir('src/routes');
```

### `toOutputPath(sourcePath)`

Map a source path to its build-output counterpart: strips the leading `src/` and rewrites a TypeScript source extension to `.js` (directories keep their shape). It's a **pure path transform** — it does not check the filesystem.

```ts
import { toOutputPath } from '@arkstack/common';

toOutputPath('src/app/models/User.ts'); // <root>/dist/app/models/User.js (prod)
toOutputPath('src/routes');             // <root>/dist/routes (prod)
```

> `resolveRuntimeModule` / `resolveRuntimeDir` consult the filesystem and pick the existing file/dir for the current environment; `toOutputPath` just computes the mapped location.

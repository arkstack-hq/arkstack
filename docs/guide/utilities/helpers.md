# Helpers

Small utility functions that can be used across the application for common tasks.

## `perPage(query, defaults?)`

Extracts a safe pagination limit from a query object. Clamps the result between `1` and `50` or the configured default `maxPerPage`, defaulting to `25` or the configured default `perPage`.

```ts
import { perPage } from '@arkstack/common';

const limit = perPage({ limit: 100 }); // 50 (clamped)
const limit2 = perPage({ limit: 100 }, { maxPerPage: 100 }); // 100
const limit3 = perPage({}); // 25 (default)
const limit3 = perPage({}, { perPage: 100 }); // 100
```

## `resolvePagination(query, defaults?)`

Extracts the current page and a safe pagination limit from a query object. Clamps the resulting `perPage` between `1` and `50` or the configured default `maxPerPage`, defaulting to `25` or the configured default `perPage`.

```ts
import { resolvePagination } from '@arkstack/common';

const limit = resolvePagination({ limit: 100 }); // {perPage: 50, page: 1} (clamped)
const limi2 = resolvePagination({ limit: 100 }, { maxPerPage: 100 }); // {perPage: 100, page: 1}
const limit3 = resolvePagination({}); // {perPage: 50, page: 1} (default)
const limit4 = resolvePagination({}, { perPage: 100, page: 2 }); // {perPage: 100, page: 2}
```

## `getModel(modelName)`

Dynamically imports an application model by name from the configured models directory (default: `./src/app/models`). In production it loads the compiled model from the build output instead of the TypeScript source — see [Deployment](/guide/deployment). Supports augmenting `ModelRegistry` for type-safe lookups.

```ts
import { getModel } from '@arkstack/common';

const User = await getModel('User');
const users = await User.findAll();

// With type augmentation:
declare module '@arkstack/common' {
  interface ModelRegistry {
    User: typeof User;
  }
}

const TypedUser = await getModel('User'); // typeof User
```

## `resolveRuntimeModule(sourcePath)`

Resolve an application module's source path to a file that can be imported at runtime, the source TypeScript in development, the compiled file in the build output in production. See [Deployment](/guide/deployment#resolution-helpers).

```ts
import { resolveRuntimeModule, importFile } from '@arkstack/common';

const path = resolveRuntimeModule('src/app/models/User');
const module = await importFile(path);
```

## `resolveRuntimeDir(sourcePath)`

The directory counterpart of `resolveRuntimeModule`, resolves an application source directory to its runtime location (build output in production, source in development) with no extension handling.

```ts
import { resolveRuntimeDir } from '@arkstack/common';

const dir = resolveRuntimeDir('src/routes'); // dist/routes in production
```

## `toOutputPath(sourcePath)`

Pure path transform that maps a source path to its build-output counterpart — strips the leading `src/` and rewrites a TypeScript extension to `.js` — without touching the filesystem.

```ts
import { toOutputPath } from '@arkstack/common';

toOutputPath('src/app/models/User.ts'); // <root>/dist/app/models/User.js (production)
```

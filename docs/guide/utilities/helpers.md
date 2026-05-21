# Helpers

Small utility functions that can be used across the application for common tasks.

## `perPage(query)`

Extracts a safe pagination limit from a query object. Clamps the result between `1` and `50`, defaulting to `15`.

```ts
import { perPage } from '@arkstack/common';

const limit = perPage({ limit: 100 }); // 50 (clamped)
const limit2 = perPage({}); // 15 (default)
```

## `getModel(modelName)`

Dynamically imports an application model by name from the configured models directory (default: `./src/app/models`). Supports augmenting `ModelRegistry` for type-safe lookups.

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

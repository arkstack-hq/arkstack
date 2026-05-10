# @arkstack/common

Shared foundations and core utilities for Arkstack applications and packages providing:

- Logging utilities
- Configuration management
- `ErrorHandler` and shared exception classes
- Hashing and encryption helpers
- Typed model resolution
- Pagination helpers

## Model Resolution

```ts
import { getModel } from '@arkstack/common';
import type User from './src/app/models/User';

const UserModel = await getModel<typeof User>('User');
```

Apps can augment `ModelRegistry` for typed model names:

```ts
declare module '@arkstack/common' {
  interface ModelRegistry {
    User: typeof User;
  }
}
```

## Error Handling

```ts
import { ErrorHandler } from '@arkstack/common';

const payload = ErrorHandler.createErrorPayload(error);
```

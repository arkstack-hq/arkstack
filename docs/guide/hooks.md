# Hooks

Arkstack exposes a small shared hook registry through `@arkstack/common`. Hooks are useful when a package or application wants to register callbacks around named extension points without coupling the caller to a concrete implementation.

## Register Hooks

Use `Hook.set(name, positions)` to register callbacks. The built-in positions are `before` and `after`, and applications can use custom position names when a package documents them.

```ts
import { Hook } from '@arkstack/common';

Hook.set('middleware:auth', {
  before: (context) => {
    context.logger?.debug('auth middleware starting');
  },
  after: (context) => {
    context.logger?.debug('auth middleware finished');
  },
});
```

Calling `set()` again for the same hook name merges positions and only overwrites the positions supplied in the new registration.

```ts
Hook.set('middleware:auth', {
  error: (error) => {
    console.error(error);
  },
});
```

## Read And Run Hooks

Use `Hook.has()` to check for a hook and `Hook.get()` to retrieve either the full hook object or one position.

```ts
const beforeAuth = Hook.get('middleware:auth', 'before');

beforeAuth?.({ logger });
```

You can also read every registered hook:

```ts
const hooks = Hook.getAll();
```

## Remove Hooks

Unset a single hook, a single position, or every registered hook:

```ts
Hook.unset('middleware:auth', 'before');
Hook.unset('middleware:auth');
Hook.clear();
```

Hooks are process-local. Register them during application boot or test setup so their lifecycle is explicit.

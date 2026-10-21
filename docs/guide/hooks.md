# Hooks

Arkstack exposes a small shared hook registry through `@arkstack/foundry`. Hooks are useful when a package or application wants to register callbacks around named extension points without coupling the caller to a concrete implementation.

There is one registry per process. `@arkstack/common` re-exports the same `Hook`, so a hook registered through either import is seen by code using the other.

## Listen To Hooks

Use `Hook.on(name, positions)` to register callbacks. The built-in positions are `before` and `after`, and applications can use custom position names when a package documents them.

```ts
import { Hook } from '@arkstack/foundry'

Hook.on('middleware:auth', {
  before: (context) => {
    context.logger?.debug('auth middleware starting')
  },
  after: (context) => {
    context.logger?.debug('auth middleware finished')
  },
})
```

Registering the same hook name again merges positions and only overwrites the positions supplied in the new registration.

```ts
Hook.on('middleware:auth', {
  error: (error) => {
    console.error(error)
  },
})
```

## Emit Hooks

Use `Hook.emit(name, position, ...args)` to fire a position. Unlike Node's `EventEmitter.emit()`, which returns a boolean, it returns the callback's result: a Promise for an async hook, so it can be awaited. When nothing is registered there it does nothing and returns `undefined`, so call sites need no `has()` check.

```ts
await Hook.emit('middleware:auth', 'before', { req, res })
```

## Read Hooks

`Hook.get()` retrieves the full hook object or one position's callback without calling it, and `Hook.has()` checks for one.

```ts
const beforeAuth = Hook.get('middleware:auth', 'before')

Hook.has('middleware:auth', 'after') // true | false
```

You can also read every registered hook:

```ts
const hooks = Hook.all()
```

## Stop Listening

Remove a single position, a whole hook, or every registered hook:

```ts
Hook.off('middleware:auth', 'before')
Hook.off('middleware:auth')
Hook.clear() // or Hook.off() with no arguments
```

Removing a name that isn't registered does nothing.

## Typed Hooks

Augment `HookRegistry` on `@arkstack/foundry` to type a hook's positions and arguments. `on()` and `emit()` then check them.

```ts
declare module '@arkstack/foundry' {
  interface HookRegistry {
    'billing:charge': {
      after: (amount: number) => void | Promise<void>
    }
  }
}
```

Augment `@arkstack/foundry`, not `@arkstack/common`: `common` only re-exports these types, and an augmentation there declares a separate, unused interface.

## Built-in Hooks

| Hook              | Positions                  | Arguments                                   |
| ----------------- | -------------------------- | ------------------------------------------- |
| `server:start`    | `after`, `tunneled`        | `ServerStartInfo` (see below)               |
| `middleware:auth` | `before`, `after`, `error` | see [Authentication](./authentication)      |
| `boot`            | `before`, `after`          | `(port, app)`                               |
| `shutdown`        | `before`                   | `({})`, on `SIGINT` / `SIGTERM` / `SIGQUIT` |
| `set:root-dir`    | `after`                    | `(dir)`                                     |

### Server start

Every driver runs `server:start` (`after`) once its server is listening, after the startup banner and once any tunnel is open. It fires in development and production alike.

```ts
import { Hook } from '@arkstack/foundry'

Hook.on('server:start', {
  after: ({ url }) => {
    console.log(`ready at ${url}`)
  },
})
```

`ServerStartInfo` (exported from `@arkstack/contract`) carries `host`, `port`, `scheme`, `secure`, a browsable local `url` (`localhost` when bound to every interface), and `tunnelUrl`: the `TUNNEL_URL` you set, or the URL `ark dev -t` opened.

To react only when the server is reachable through a tunnel, use the `tunneled` position. It runs after `after`, only when a tunnel is open, and its `TunneledServerStartInfo` payload guarantees `tunnelUrl` is a string:

```ts
Hook.on('server:start', {
  tunneled: async ({ tunnelUrl }) => {
    await registerWebhook(`${tunnelUrl}/api/webhooks`)
  },
})
```

A listener that throws or rejects is logged and never stops the server; a failing `after` doesn't prevent `tunneled` from running.

## Deprecated Names

| Deprecated                                    | Use                             |
| --------------------------------------------- | ------------------------------- |
| `Hook.set()`                                  | `Hook.on()`                     |
| `Hook.get(name, pos, ...args)` (calling form) | `Hook.emit(name, pos, ...args)` |
| `Hook.unset()`                                | `Hook.off()`                    |
| `Hook.getAll()`                               | `Hook.all()`                    |

Hooks are process-local. Register them during application boot or test setup so their lifecycle is explicit.

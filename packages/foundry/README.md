# `@arkstack/foundry`

[![Foundry](https://img.shields.io/npm/dt/@arkstack/foundry?style=flat-square&label=@arkstack/foundry&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/foundry)](https://www.npmjs.com/package/@arkstack/foundry)

Extensibility primitives and framework internals for the Arkstack ecosystem. This package provides the tools that shape how Arkstack behaves at runtime. Hooks, lifecycle interception, and utilities designed to extend and adapt the framework without modifying its core.

## Installation

```bash
pnpm add @arkstack/foundry
```

## Modules

### Hook

**`src/Hook.ts`**

A global, named hook registry for extending Arkstack internals without modifying core code. Hooks are keyed by name and support positional slots (`before`, `after`, or any custom string). There is one registry per process: `@arkstack/common` re-exports this same `Hook`.

#### `Hook.on(name, positions)`

Registers callbacks for a hook's positions. Registering the same name again merges: only the positions supplied are added or replaced.

```ts
import { Hook } from '@arkstack/foundry'

Hook.on('request:handle', {
  before: (ctx) => console.log('before handler'),
  after: (ctx) => console.log('after handler'),
})
```

#### `Hook.emit(name, pos, ...args)`

Calls a position with the given arguments and returns its result: a Promise for an async hook, so it can be awaited. When nothing is registered there it does nothing and returns `undefined`, so callers need no `has()` check.

```ts
await Hook.emit('request:handle', 'before', ctx)
```

#### `Hook.get(name, pos?)`

Retrieves the full hook object or one position's callback, without calling it.

```ts
const hook = Hook.get('request:handle') // IHook | undefined
const before = Hook.get('request:handle', 'before') // function | undefined
```

#### `Hook.has(name, pos?)`

Checks whether a hook (or a specific position within it) exists.

```ts
Hook.has('request:handle') // true | false
Hook.has('request:handle', 'after') // true | false
```

#### `Hook.off(name?, pos?)`

Removes a hook or a single position. A hook left with no positions is deleted. Called with no arguments it clears every hook; a name that isn't registered is a no-op.

```ts
Hook.off('request:handle', 'before') // removes only the 'before' callback
Hook.off('request:handle') // removes the entire hook
Hook.off() // clears all hooks
```

#### `Hook.all()`

Returns all registered hooks as a plain record.

```ts
const hooks = Hook.all()
// { 'request:handle': { before: fn, after: fn } }
```

#### `Hook.clear()`

Clears all registered hooks.

#### Deprecated aliases

`set()` → `on()`, `unset()` → `off()`, `getAll()` → `all()`. `get(name, pos, ...args)` with arguments still calls the hook, but use `emit()`; `get()` should only retrieve.

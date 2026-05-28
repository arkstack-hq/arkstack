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

A global, named hook registry for extending Arkstack internals without modifying core code. Hooks are keyed by name and support positional slots (`before`, `after`, or any custom string).

#### `Hook.set(name, hook)`

Registers a hook. Multiple calls for the same name are merged.

```ts
import { Hook } from '@arkstack/common';

Hook.set('request:handle', {
  before: (ctx) => console.log('before handler'),
  after: (ctx) => console.log('after handler'),
});
```

#### `Hook.get(name, pos?)`

Retrieves the full hook object or a specific positional handler.

```ts
const hook = Hook.get('request:handle'); // IHook | undefined
const before = Hook.get('request:handle', 'before'); // function | undefined
```

#### `Hook.has(name, pos?)`

Checks whether a hook (or a specific position within it) exists.

```ts
Hook.has('request:handle'); // true | false
Hook.has('request:handle', 'after'); // true | false
```

#### `Hook.unset(name?, pos?)`

Removes a hook or a single positional handler. If the hook becomes empty after removal, it is deleted entirely. Called with no arguments, it delegates to `Hook.clear()`.

```ts
Hook.unset('request:handle', 'before'); // removes only the 'before' handler
Hook.unset('request:handle'); // removes the entire hook
Hook.unset(); // clears all hooks
```

#### `Hook.getAll()`

Returns all registered hooks as a plain record.

```ts
const hooks = Hook.getAll();
// { 'request:handle': { before: fn, after: fn } }
```

#### `Hook.clear()`

Clears all registered hooks.

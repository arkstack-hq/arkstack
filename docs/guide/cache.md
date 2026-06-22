# Cache

Arkstack's cache provides a unified, driver-based caching layer with a consistent API across in-memory, file, Redis, and database backends.

## Install

Full app templates include the cache package and a `src/config/cache.ts` file. If you are adding it manually, install:

::: code-group

```sh [npm]
npm i @arkstack/cache
```

```sh [pnpm]
pnpm add @arkstack/cache
```

```sh [yarn]
yarn add @arkstack/cache
```

:::

The Redis store relies on `ioredis`, and the database store on `@arkstack/database`. Both are optional peer dependencies, install them only for the stores you use.

## Stores

| Driver     | Backing store                    | Notes                            |
| ---------- | -------------------------------- | -------------------------------- |
| `memory`   | in-process `Map`                 | default; great for dev and tests |
| `file`     | JSON files on disk               | no external service required     |
| `redis`    | Redis (via `ioredis`)            | distributed; atomic counters     |
| `database` | a table via `@arkstack/database` | reuses your database connection  |

## Configuration

Cache configuration lives in `src/config/cache.ts` — a default store, a global key prefix, and the configured stores.

```ts
// src/config/cache.ts
import { Arkstack } from '@arkstack/contract';
import { CacheConfig } from '@arkstack/cache';
import { env } from '@arkstack/common';
import path from 'node:path';

export default (): CacheConfig => ({
  default: env('CACHE_STORE', 'memory'),
  prefix: env('CACHE_PREFIX', 'arkstack_cache_'),
  stores: {
    memory: { driver: 'memory' },
    file: {
      driver: 'file',
      path: path.join(Arkstack.rootDir(), './storage/framework/cache'),
    },
    redis: {
      driver: 'redis',
      host: env('REDIS_HOST', '127.0.0.1'),
      port: env('REDIS_PORT', 6379),
    },
    database: { driver: 'database', table: 'cache' },
  },
});
```

The `database` store expects a table with `key` (string, primary), `value` (text), and `expiration` (nullable integer, epoch seconds) columns. Publish the ready-made migration with:

```sh
pnpm ark publish --tag cache-migrations
pnpm ark migrate
```

## Usage

Reach for the static `Cache` facade, which proxies the default store:

```ts
import { Cache } from '@arkstack/cache';

await Cache.put('user:1', user, 60); // ttl in seconds
await Cache.get('user:1');
await Cache.has('user:1');
await Cache.forget('user:1');
```

The TTL accepts a number of seconds, a `Date`, or `null` (store forever). A non-positive TTL is treated as already expired.

### Retrieve & store

`remember` returns a cached value or computes, stores, and returns it (read-through caching):

```ts
const stats = await Cache.remember('stats', 300, async () => computeStats());

// never expires
const config = await Cache.rememberForever('config', () => loadConfig());
```

### Other helpers

```ts
await Cache.add('once', 'value', 60); // only stores if absent; returns false otherwise
await Cache.pull('flash'); // get and forget in one call
await Cache.forever('flag', true); // store with no expiration
await Cache.increment('hits'); // atomic on redis
await Cache.decrement('hits', 2);
await Cache.flush(); // clear the whole store
```

| Method                                      | Description                                             |
| ------------------------------------------- | ------------------------------------------------------- |
| `get(key, default?)`                        | Retrieve a value, or the (optionally callable) default. |
| `put(key, value, ttl?)`                     | Store a value (alias `set`).                            |
| `add(key, value, ttl?)`                     | Store only if the key is absent.                        |
| `has(key)` / `missing(key)`                 | Existence checks.                                       |
| `pull(key, default?)`                       | Retrieve and delete.                                    |
| `remember(key, ttl, cb)`                    | Read-through cache.                                     |
| `rememberForever(key, cb)`                  | Read-through cache with no expiration.                  |
| `forever(key, value)`                       | Store with no expiration.                               |
| `increment(key, n?)` / `decrement(key, n?)` | Atomic counters.                                        |
| `forget(key)` / `flush()`                   | Remove one key / everything.                            |

## Choosing a store

Target a specific store with `store()`:

```ts
await Cache.store('redis').forever('flag', true);
await Cache.store('file').remember('report', 3600, buildReport);
```

## Console

Flush a store from the CLI:

```sh
ark cache:clear              # default store
ark cache:clear --store=redis
```

## Custom drivers

Implement the `Store` contract and register it with `Cache.extend`:

```ts
import { Cache, Store } from '@arkstack/cache';

class TagStore extends Store {
  /* implement get/put/forever/increment/decrement/forget/flush/getPrefix */
}

Cache.extend('tags', (config) => new TagStore(/* ... */));
```

Then reference it in a store config: `{ driver: 'tags' }`.

# @arkstack/cache

[![@arkstack/cache](https://img.shields.io/npm/dt/@arkstack/cache?style=flat-square&label=@arkstack/cache&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/cache)](https://www.npmjs.com/package/@arkstack/cache)

Cache module for Arkstack, providing a unified, driver based caching layer for the framework.

## Stores

`@arkstack/cache` ships with four stores out of the box:

| Driver     | Backing store                | Notes                                    |
| ---------- | ---------------------------- | ---------------------------------------- |
| `memory`   | in-process `Map`             | default; great for dev and tests         |
| `file`     | JSON files on disk           | no external service required             |
| `redis`    | Redis (via `ioredis`)        | distributed; atomic counters             |
| `database` | a table via `@arkstack/database` | reuses your database connection      |

## Configuration

```ts
// src/config/cache.ts
import { Arkstack } from '@arkstack/contract'
import type { CacheConfig } from '@arkstack/cache'
import path from 'node:path'

export default (): CacheConfig => ({
  default: env('CACHE_STORE', 'memory'),
  prefix: env('CACHE_PREFIX', 'arkstack_cache_'),
  stores: {
    memory: { driver: 'memory' },
    file: { driver: 'file', path: path.join(Arkstack.rootDir(), './storage/framework/cache') },
    redis: { driver: 'redis', host: env('REDIS_HOST', '127.0.0.1'), port: env('REDIS_PORT', 6379) },
    database: { driver: 'database', table: 'cache' },
  },
})
```

## Usage

```ts
import { Cache } from '@arkstack/cache'

// default store
await Cache.put('user:1', user, 60)        // ttl in seconds
await Cache.get('user:1')
await Cache.forget('user:1')

// remember: read-through caching
const stats = await Cache.remember('stats', 300, () => computeStats())

// counters
await Cache.increment('hits')
await Cache.decrement('hits', 2)

// a specific store
await Cache.store('redis').forever('flag', true)
```

The ttl accepts a number of seconds, a `Date`, or `null` (forever).

## Custom drivers

```ts
import { Cache, Store } from '@arkstack/cache'

class TagStore extends Store { /* ... implement the Store contract ... */ }

Cache.extend('tags', (config) => new TagStore(config))
```

Then reference `{ driver: 'tags' }` in a store config.

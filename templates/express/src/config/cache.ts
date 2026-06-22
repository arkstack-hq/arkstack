import { Arkstack } from '@arkstack/contract'
import type { CacheConfig } from '@arkstack/cache'
import path from 'node:path'

export default (): CacheConfig => {
    return {
        /**
         * Default Cache Store
         *
         * The store used by the framework whenever a store is not explicitly
         * requested. Supported drivers: memory, file, redis, database.
         */
        default: env('CACHE_STORE', 'memory'),

        /**
         * Cache Key Prefix
         *
         * Prepended to every cache key to avoid collisions between applications
         * that share the same backing store.
         */
        prefix: env('CACHE_PREFIX', 'arkstack_cache_'),

        /**
         * Cache Stores
         *
         * Configure as many stores as you like. Each is referenced by name via
         * `Cache.store('<name>')`.
         */
        stores: {
            memory: {
                driver: 'memory',
            },
            file: {
                driver: 'file',
                path: path.join(Arkstack.rootDir(), './storage/framework/cache'),
            },
            redis: {
                driver: 'redis',
                host: env('REDIS_HOST', '127.0.0.1'),
                port: env('REDIS_PORT', 6379),
                password: env('REDIS_PASSWORD'),
                db: env('REDIS_CACHE_DB', 1),
            },
            database: {
                driver: 'database',
                table: env('CACHE_TABLE', 'cache'),
            },
        },
    }
}

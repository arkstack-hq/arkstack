import type { CacheConfig } from '../../src'
import { Arkstack } from '@arkstack/contract'
import path from 'node:path'

export default (): CacheConfig => {
    return {
        default: env('CACHE_STORE', 'memory'),

        prefix: env('CACHE_PREFIX', 'arkstack_cache_'),

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
            },
            database: {
                driver: 'database',
                table: 'cache',
            },
        },
    }
}

import type { RedisClient, RedisStoreConfig } from '../types'

import { Store } from '../Contracts/Store'

/**
 * A Redis backed cache store using an ioredis compatible client.
 *
 * Values are JSON serialized. Numeric helpers use native `INCRBY`/`DECRBY` so
 * counters stay atomic across processes. `ioredis` is an optional peer
 * dependency; it is imported lazily so applications that never use the redis
 * store don't need it installed.
 */
export class RedisStore extends Store {
    private client?: RedisClient

    constructor(
        private readonly redisConfig: RedisStoreConfig,
        private readonly prefix = '',
    ) {
        super()
    }

    getPrefix (): string {
        return [this.prefix, this.redisConfig.prefix].filter(Boolean).join('')
    }

    private prefixed (key: string): string {
        return this.getPrefix() + key
    }

    private async connection (): Promise<RedisClient> {
        if (this.client) {
            return this.client
        }

        let Redis: new (...args: any[]) => RedisClient

        try {
            Redis = (await import('ioredis' as string)).default as never
        } catch {
            throw new Error(
                'The redis cache store requires the "ioredis" package. Install it with your package manager.',
            )
        }

        this.client = this.redisConfig.url
            ? new Redis(this.redisConfig.url)
            : new Redis({
                host: this.redisConfig.host ?? '127.0.0.1',
                port: this.redisConfig.port ?? 6379,
                password: this.redisConfig.password,
                db: this.redisConfig.db ?? 0,
            })

        return this.client
    }

    /**
     * Disconnect the underlying client. Useful for tests and graceful shutdown.
     */
    async disconnect (): Promise<void> {
        await this.client?.quit()
        this.client = undefined
    }

    async get<T = unknown> (key: string): Promise<T | null> {
        const raw = await (await this.connection()).get(this.prefixed(key))

        if (raw === null) {
            return null
        }

        try {
            return JSON.parse(raw) as T
        } catch {
            return raw as unknown as T
        }
    }

    async put (key: string, value: unknown, seconds: number | null = null): Promise<boolean> {
        const client = await this.connection()
        const serialized = JSON.stringify(value)

        if (seconds === null) {
            await client.set(this.prefixed(key), serialized)
        } else {
            await client.set(this.prefixed(key), serialized, 'EX', seconds)
        }

        return true
    }

    async forever (key: string, value: unknown): Promise<boolean> {
        return this.put(key, value, null)
    }

    async increment (key: string, value = 1): Promise<number | false> {
        return (await this.connection()).incrby(this.prefixed(key), value)
    }

    async decrement (key: string, value = 1): Promise<number | false> {
        return (await this.connection()).decrby(this.prefixed(key), value)
    }

    async forget (key: string): Promise<boolean> {
        return (await (await this.connection()).del(this.prefixed(key))) > 0
    }

    async flush (): Promise<boolean> {
        const client = await this.connection()
        const pattern = `${this.getPrefix()}*`
        let cursor = '0'

        do {
            const [next, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
            cursor = next

            if (keys.length > 0) {
                await client.del(...keys)
            }
        } while (cursor !== '0')

        return true
    }
}

import type { Store } from './Contracts/Store'

/**
 * A value, or a function (sync or async) that resolves to a value.
 *
 * Used for cache defaults and the `remember` callbacks.
 */
export type Resolvable<T> = T | (() => T | Promise<T>)

/**
 * Time to live for a cache entry.
 *
 * - `number`  number of seconds the entry should live.
 * - `Date`    an absolute expiry time.
 * - `null`    store forever (no expiration).
 */
export type CacheTtl = number | Date | null

/**
 * Built in cache store driver names.
 */
export type CacheDriverName = 'memory' | 'array' | 'file' | 'redis' | 'database'

export interface FilePayload {
    value: unknown
    /** Absolute expiry in epoch milliseconds, or `null` for forever. */
    expiresAt: number | null
}

export interface MemoryStoreConfig {
    driver: 'memory' | 'array'
}

export interface FileStoreConfig {
    driver: 'file'
    /** Absolute path to the directory cache files are written to. */
    path: string
}

export interface RedisStoreConfig {
    driver: 'redis'
    /** A pre built ioredis connection string, e.g. `redis://localhost:6379`. */
    url?: string
    host?: string
    port?: number
    password?: string
    db?: number
    /** Optional per store key prefix applied on top of the global prefix. */
    prefix?: string
}

export interface DatabaseStoreConfig {
    driver: 'database'
    /** The table the cache entries are stored in. */
    table: string
    /** Optional named database connection. */
    connection?: string
}

/**
 * Apps may augment this registry to register custom store driver configs.
 */
export interface CustomCacheStoreRegistry { }

export type CacheStoreConfig =
    | MemoryStoreConfig
    | FileStoreConfig
    | RedisStoreConfig
    | DatabaseStoreConfig
    | ({ driver: string } & Record<string, unknown>)

export interface CacheConfig {
    /**
     * The default cache store used when no store is explicitly requested.
     */
    default: string

    /**
     * A string prepended to every cache key to avoid collisions between
     * applications sharing the same backing store.
     */
    prefix: string

    /**
     * The configured cache stores. Each entry is keyed by the name used with
     * `Cache.store('<name>')`.
     */
    stores: Record<string, CacheStoreConfig> & CustomCacheStoreRegistry
}

/**
 * Signature for a custom store factory registered via `Cache.extend`.
 */
export type CacheStoreFactory = (config: CacheStoreConfig) => Store

export interface MemoryEntry {
    value: unknown
    /** Absolute expiry in epoch milliseconds, or `null` for forever. */
    expiresAt: number | null
}


export interface CacheRow {
    key: string
    value: string
    /** Absolute expiry in epoch seconds, or `null` for forever. */
    expiration: number | null
}

/**
 * Structural type for the `DB` class exported by `@arkstack/database`, declared
 * locally so the cache package does not depend on it at build time (it is an
 * optional peer dependency).
 */
export interface DatabaseFacade {
    table (table: string): {
        where (where: Record<string, unknown>): {
            first (): Promise<CacheRow | null>
            delete (): Promise<unknown>
        }
        updateOrInsert (
            attributes: Record<string, unknown>,
            values: Record<string, unknown>,
        ): Promise<boolean>
        delete (): Promise<unknown>
    }
}

/**
 * Minimal structural type for the slice of the ioredis client we use. Declared
 * locally so the package does not need ioredis types at build time (it is an
 * optional peer dependency).
 */
export interface RedisClient {
    get (key: string): Promise<string | null>
    set (key: string, value: string): Promise<unknown>
    set (key: string, value: string, mode: 'EX', seconds: number): Promise<unknown>
    del (...keys: string[]): Promise<number>
    incrby (key: string, value: number): Promise<number>
    decrby (key: string, value: number): Promise<number>
    scan (cursor: string, match: 'MATCH', pattern: string, count: 'COUNT', n: number): Promise<[string, string[]]>
    quit (): Promise<unknown>
}
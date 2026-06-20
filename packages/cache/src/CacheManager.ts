import type {
    CacheStoreConfig,
    CacheStoreFactory,
    CacheTtl,
    DatabaseStoreConfig,
    FileStoreConfig,
    RedisStoreConfig,
    Resolvable,
} from './types'

import { DatabaseStore } from './drivers/DatabaseStore'
import { FileStore } from './drivers/FileStore'
import { MemoryStore } from './drivers/MemoryStore'
import { RedisStore } from './drivers/RedisStore'
import { Repository } from './Repository'
import { Store } from './Contracts/Store'
import { configure } from './config'

/**
 * The cache manager and primary entry point of `@arkstack/cache`.
 *
 * Resolves named cache stores from configuration, memoizes the resulting
 * repositories, and exposes static convenience methods that proxy the default
 * store, e.g.:
 *
 * ```ts
 * await Cache.put('user:1', user, 60)
 * await Cache.store('redis').remember('stats', 300, computeStats)
 * ```
 */
export class Cache {
    private static repositories: Record<string, Repository> = {}
    private static customDrivers: Record<string, CacheStoreFactory> = {}

    /**
     * Resolve a cache repository for the given store name (or the default store
     * when omitted). Repositories are memoized per name.
     */
    static store (name?: string): Repository {
        const store = name ?? configure('default', 'memory')

        if (!this.repositories[store]) {
            this.repositories[store] = this.resolve(store)
        }

        return this.repositories[store]
    }

    /**
     * Alias for {@link store}.
     */
    static driver (name?: string): Repository {
        return this.store(name)
    }

    /**
     * Register a custom store driver factory, used when a store's `driver` does
     * not match a built in one.
     */
    static extend (driver: string, factory: CacheStoreFactory): typeof Cache {
        this.customDrivers[driver] = factory

        return this
    }

    /**
     * Clear the memoized repositories. Mainly useful between tests or after the
     * configuration changes at runtime.
     */
    static clearResolved (): void {
        this.repositories = {}
    }

    /**
     * Build a repository for a configured store from scratch.
     */
    private static resolve (name: string): Repository {
        const config = configure(`stores.${name}` as never, undefined) as CacheStoreConfig | undefined

        if (!config) {
            throw new Error(`Cache store "${name}" is not configured.`)
        }

        return new Repository(this.createStore(config))
    }

    /**
     * Instantiate the concrete {@link Store} for a store config.
     */
    private static createStore (config: CacheStoreConfig): Store {
        const prefix = configure('prefix', '') as string

        switch (config.driver) {
            case 'memory':
            case 'array':
                return new MemoryStore(prefix)
            case 'file':
                return new FileStore((config as FileStoreConfig).path, prefix)
            case 'redis':
                return new RedisStore(config as RedisStoreConfig, prefix)
            case 'database':
                return new DatabaseStore(config as DatabaseStoreConfig, prefix)
            default:
                if (this.customDrivers[config.driver]) {
                    return this.customDrivers[config.driver](config)
                }

                throw new Error(`Unsupported cache driver: ${config.driver}`)
        }
    }

    static has (key: string): Promise<boolean> {
        return this.store().has(key)
    }

    static missing (key: string): Promise<boolean> {
        return this.store().missing(key)
    }

    static get<T = unknown> (key: string, defaultValue?: Resolvable<T | null>): Promise<T | null> {
        return this.store().get<T>(key, defaultValue)
    }

    static pull<T = unknown> (key: string, defaultValue?: Resolvable<T | null>): Promise<T | null> {
        return this.store().pull<T>(key, defaultValue)
    }

    static put (key: string, value: unknown, ttl?: CacheTtl): Promise<boolean> {
        return this.store().put(key, value, ttl)
    }

    static set (key: string, value: unknown, ttl?: CacheTtl): Promise<boolean> {
        return this.store().set(key, value, ttl)
    }

    static add (key: string, value: unknown, ttl?: CacheTtl): Promise<boolean> {
        return this.store().add(key, value, ttl)
    }

    static forever (key: string, value: unknown): Promise<boolean> {
        return this.store().forever(key, value)
    }

    static increment (key: string, value?: number): Promise<number | false> {
        return this.store().increment(key, value)
    }

    static decrement (key: string, value?: number): Promise<number | false> {
        return this.store().decrement(key, value)
    }

    static remember<T> (key: string, ttl: CacheTtl, callback: () => T | Promise<T>): Promise<T> {
        return this.store().remember(key, ttl, callback)
    }

    static rememberForever<T> (key: string, callback: () => T | Promise<T>): Promise<T> {
        return this.store().rememberForever(key, callback)
    }

    static forget (key: string): Promise<boolean> {
        return this.store().forget(key)
    }

    static delete (key: string): Promise<boolean> {
        return this.store().delete(key)
    }

    static flush (): Promise<boolean> {
        return this.store().flush()
    }

    static clear (): Promise<boolean> {
        return this.store().clear()
    }
}

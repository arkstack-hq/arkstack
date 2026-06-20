import type { CacheTtl, Resolvable } from './types'

import { Store } from './Contracts/Store'

/**
 * Resolve a possibly callable default/value into a concrete value.
 */
const resolve = async <T> (value: Resolvable<T>): Promise<T> => {
    return typeof value === 'function'
        ? await (value as () => T | Promise<T>)()
        : value
}

/**
 * Normalize a {@link CacheTtl} into a whole number of seconds, or `null` for a
 * forever entry. A non positive duration is treated as already expired and
 * returns `0`, signalling the caller to skip writing.
 */
export const ttlToSeconds = (ttl: CacheTtl): number | null => {
    if (ttl === null || ttl === undefined) {
        return null
    }

    if (ttl instanceof Date) {
        return Math.max(0, Math.round((ttl.getTime() - Date.now()) / 1000))
    }

    return Math.max(0, Math.round(ttl))
}

/**
 * A high level wrapper around a {@link Store} that provides the developer facing
 * cache API. A repository is what `Cache.store()` returns.
 */
export class Repository {
    constructor(protected readonly store: Store) { }

    /**
     * Get the underlying store driver.
     */
    getStore (): Store {
        return this.store
    }

    /**
     * Determine whether an item exists in the cache and has not expired.
     * 
     * @param key 
     * @returns 
     */
    async has (key: string): Promise<boolean> {
        return (await this.store.get(key)) !== null
    }

    /**
     * Determine whether an item is missing from the cache.
     * 
     * @param key 
     * @returns 
     */
    async missing (key: string): Promise<boolean> {
        return !(await this.has(key))
    }

    /**
     * Retrieve an item from the cache, falling back to `defaultValue` (which may
     * be a callback) when the item is absent.
     * 
     * @param key 
     * @returns 
     */
    async get<T = unknown> (key: string, defaultValue: Resolvable<T | null> = null): Promise<T | null> {
        const value = await this.store.get<T>(key)

        if (value === null || value === undefined) {
            return resolve(defaultValue)
        }

        return value
    }

    /**
     * Retrieve an item and delete it from the cache in a single call.
     * 
     * @param key 
     * @param defaultValue 
     * @returns 
     */
    async pull<T = unknown> (key: string, defaultValue: Resolvable<T | null> = null): Promise<T | null> {
        const value = await this.get<T>(key, defaultValue)

        await this.forget(key)

        return value
    }

    /**
     * Store an item in the cache. A `null`/omitted ttl stores the item forever;
     * a non positive ttl is a no-op that also forgets any existing entry.
     * 
     * @param key 
     * @param defaultValue 
     * @returns 
     */
    async put (key: string, value: unknown, ttl: CacheTtl = null): Promise<boolean> {
        const seconds = ttlToSeconds(ttl)

        if (seconds !== null && seconds <= 0) {
            await this.forget(key)

            return false
        }

        return this.store.put(key, value, seconds)
    }

    /**
     * Alias for {@link put}.
     * 
     * @param key 
     * @param defaultValue 
     * @returns 
     */
    async set (key: string, value: unknown, ttl: CacheTtl = null): Promise<boolean> {
        return this.put(key, value, ttl)
    }

    /**
     * Store an item only if it is not already present. Returns `false` when the
     * key already exists.
     * 
     * @param key 
     * @param defaultValue 
     * @returns 
     */
    async add (key: string, value: unknown, ttl: CacheTtl = null): Promise<boolean> {
        if (await this.has(key)) {
            return false
        }

        return this.put(key, value, ttl)
    }

    /**
     * Store an item that never expires.
     * 
     * @param key 
     * @param defaultValue 
     * @returns 
     */
    async forever (key: string, value: unknown): Promise<boolean> {
        return this.store.forever(key, value)
    }

    /**
     * Increment a stored numeric value.
     * 
     * @param key 
     * @param defaultValue 
     * @returns 
     */
    async increment (key: string, value = 1): Promise<number | false> {
        return this.store.increment(key, value)
    }

    /**
     * Decrement a stored numeric value.
     * 
     * @param key 
     * @param defaultValue 
     * @returns 
     */
    async decrement (key: string, value = 1): Promise<number | false> {
        return this.store.decrement(key, value)
    }

    /**
     * Get an item from the cache, or execute the callback, store its result for
     * the given ttl, and return it.
     * 
     * @param key 
     * @param defaultValue 
     * @returns 
     */
    async remember<T> (key: string, ttl: CacheTtl, callback: () => T | Promise<T>): Promise<T> {
        const existing = await this.store.get<T>(key)

        if (existing !== null && existing !== undefined) {
            return existing
        }

        const value = await callback()

        await this.put(key, value, ttl)

        return value
    }

    /**
     * Get an item from the cache, or execute the callback and store its result
     * forever.
     * 
     * @param key 
     * @param defaultValue 
     * @returns 
     */
    async rememberForever<T> (key: string, callback: () => T | Promise<T>): Promise<T> {
        const existing = await this.store.get<T>(key)

        if (existing !== null && existing !== undefined) {
            return existing
        }

        const value = await callback()

        await this.forever(key, value)

        return value
    }

    /**
     * Alias for {@link rememberForever}.
     * 
     * @param key 
     * @param callback 
     * @returns 
     */
    async sear<T> (key: string, callback: () => T | Promise<T>): Promise<T> {
        return this.rememberForever(key, callback)
    }

    /**
     * Remove an item from the cache.
     * 
     * @param key 
     * @param callback 
     * @returns 
     */
    async forget (key: string): Promise<boolean> {
        return this.store.forget(key)
    }

    /**
     * Alias for {@link forget}.
     * 
     * @param key 
     * @param callback 
     * @returns 
     */
    async delete (key: string): Promise<boolean> {
        return this.forget(key)
    }

    /**
     * Remove every item from the cache store.
     * 
     * @param key 
     * @param callback 
     * @returns 
     */
    async flush (): Promise<boolean> {
        return this.store.flush()
    }

    /**
     * Alias for {@link flush}.
     * 
     * @param key 
     * @param callback 
     * @returns 
     */
    async clear (): Promise<boolean> {
        return this.flush()
    }
}

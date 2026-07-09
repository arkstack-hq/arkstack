/**
 * Mutual-exclusion helpers backing `withoutOverlapping()` and `onOneServer()`.
 *
 * Locks are stored in `@arkstack/cache` (an optional peer) so they coordinate
 * across processes and servers. When cache is unavailable the scheduler degrades
 * to a process-local lock — enough to prevent overlap within one process, but it
 * cannot coordinate across servers.
 */
const memoryLocks = new Map<string, number>()

/** Resolve the cache manager, or `null` when `@arkstack/cache` isn't installed. */
const cache = async (): Promise<{
    add(key: string, value: unknown, ttl?: number): Promise<boolean>
    forget(key: string): Promise<boolean>
} | null> => {
    try {
        const specifier = '@arkstack/cache'
        const mod = await import(specifier)

        return mod.Cache ?? null
    } catch {
        return null
    }
}

/**
 * Try to acquire a lock. Returns `true` when acquired, `false` when already held.
 *
 * @param key         The lock key.
 * @param ttlSeconds  How long the lock is held before it auto-expires.
 */
export const acquireLock = async (key: string, ttlSeconds: number): Promise<boolean> => {
    const store = await cache()

    if (store) {
        try {
            return await store.add(key, new Date().toISOString(), ttlSeconds)
        } catch {
            // Cache installed but not configured — fall back to a process-local lock.
        }
    }

    const now = Date.now()
    const expiry = memoryLocks.get(key)

    if (expiry && expiry > now) {
        return false
    }

    memoryLocks.set(key, now + ttlSeconds * 1_000)

    return true
}

/**
 * Release a previously acquired lock.
 *
 * @param key  The lock key.
 */
export const releaseLock = async (key: string): Promise<void> => {
    const store = await cache()

    if (store) {
        try {
            await store.forget(key)

            return
        } catch {
            // Cache installed but not configured — fall back to a process-local lock.
        }
    }

    memoryLocks.delete(key)
}

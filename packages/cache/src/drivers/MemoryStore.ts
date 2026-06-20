import type { MemoryEntry } from '../types'
import { Store } from '../Contracts/Store'

/**
 * An in-process cache store backed by a `Map`.
 *
 * The backing map is shared across every `MemoryStore` instance that uses the
 * same prefix, so resolving the store twice within a process sees the same data
 * (matching how the other backends behave). Great for development and tests; it
 * is not shared across processes.
 */
export class MemoryStore extends Store {
    private static stores = new Map<string, Map<string, MemoryEntry>>()

    private readonly entries: Map<string, MemoryEntry>

    constructor(private readonly prefix = '') {
        super()

        if (!MemoryStore.stores.has(prefix)) {
            MemoryStore.stores.set(prefix, new Map())
        }

        this.entries = MemoryStore.stores.get(prefix)!
    }

    getPrefix (): string {
        return this.prefix
    }

    async get<T = unknown> (key: string): Promise<T | null> {
        const entry = this.entries.get(key)

        if (!entry) {
            return null
        }

        if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
            this.entries.delete(key)

            return null
        }

        return entry.value as T
    }

    async put (key: string, value: unknown, seconds: number | null = null): Promise<boolean> {
        this.entries.set(key, {
            value,
            expiresAt: seconds === null ? null : Date.now() + seconds * 1000,
        })

        return true
    }

    async forever (key: string, value: unknown): Promise<boolean> {
        return this.put(key, value, null)
    }

    async increment (key: string, value = 1): Promise<number | false> {
        const current = await this.get(key)
        const base = current === null ? 0 : current

        if (typeof base !== 'number' || Number.isNaN(base)) {
            return false
        }

        const next = base + value
        const entry = this.entries.get(key)

        this.entries.set(key, {
            value: next,
            expiresAt: entry?.expiresAt ?? null,
        })

        return next
    }

    async decrement (key: string, value = 1): Promise<number | false> {
        return this.increment(key, -value)
    }

    async forget (key: string): Promise<boolean> {
        return this.entries.delete(key)
    }

    async flush (): Promise<boolean> {
        this.entries.clear()

        return true
    }
}

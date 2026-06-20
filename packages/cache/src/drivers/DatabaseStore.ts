import type { DatabaseFacade, DatabaseStoreConfig } from '../types'

import { Store } from '../Contracts/Store'

/**
 * A cache store that persists entries in a relational table via
 * `@arkstack/database`.
 *
 * The table is expected to have `key` (string, primary), `value` (text), and
 * `expiration` (nullable integer epoch seconds) columns. `@arkstack/database`
 * is an optional peer dependency and is imported lazily.
 */
export class DatabaseStore extends Store {
    private db?: DatabaseFacade

    constructor(
        private readonly databaseConfig: DatabaseStoreConfig,
        private readonly prefix = '',
    ) {
        super()
    }

    getPrefix (): string {
        return this.prefix
    }

    private prefixed (key: string): string {
        return this.prefix + key
    }

    private get table (): string {
        return this.databaseConfig.table
    }

    private async database (): Promise<DatabaseFacade> {
        if (this.db) {
            return this.db
        }

        try {
            const { DB } = await import('@arkstack/database' as string)
            this.db = DB as unknown as DatabaseFacade
        } catch {
            throw new Error(
                'The database cache store requires the "@arkstack/database" package.',
            )
        }

        return this.db
    }

    async get<T = unknown> (key: string): Promise<T | null> {
        const db = await this.database()
        const row = await db.table(this.table).where({ key: this.prefixed(key) }).first()

        if (!row) {
            return null
        }

        if (row.expiration !== null && row.expiration <= Math.floor(Date.now() / 1000)) {
            await db.table(this.table).where({ key: this.prefixed(key) }).delete()

            return null
        }

        try {
            return JSON.parse(row.value) as T
        } catch {
            return row.value as unknown as T
        }
    }

    async put (key: string, value: unknown, seconds: number | null = null): Promise<boolean> {
        const db = await this.database()
        const expiration = seconds === null ? null : Math.floor(Date.now() / 1000) + seconds

        await db.table(this.table).updateOrInsert(
            { key: this.prefixed(key) },
            { value: JSON.stringify(value), expiration },
        )

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
        const db = await this.database()
        const existing = await db.table(this.table).where({ key: this.prefixed(key) }).first()

        await db.table(this.table).updateOrInsert(
            { key: this.prefixed(key) },
            { value: JSON.stringify(next), expiration: existing?.expiration ?? null },
        )

        return next
    }

    async decrement (key: string, value = 1): Promise<number | false> {
        return this.increment(key, -value)
    }

    async forget (key: string): Promise<boolean> {
        const db = await this.database()
        await db.table(this.table).where({ key: this.prefixed(key) }).delete()

        return true
    }

    async flush (): Promise<boolean> {
        const db = await this.database()
        await db.table(this.table).delete()

        return true
    }
}

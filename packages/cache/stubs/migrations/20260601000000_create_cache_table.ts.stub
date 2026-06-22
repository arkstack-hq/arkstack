import { Migration, SchemaBuilder } from 'arkormx'

/**
 * Backing table for the `database` cache store (`@arkstack/cache`).
 *
 * Columns: `key` (string primary), `value` (text), `expiration` (nullable
 * epoch seconds). Adjust the table name to match `cache.stores.database.table`.
 */
export default class CreateCacheTableMigration extends Migration {
    public async up (schema: SchemaBuilder): Promise<void> {
        schema.createTable('cache', (table) => {
            table.string('key').primary()
            table.text('value')
            table.integer('expiration').nullable()
        })
    }

    public async down (schema: SchemaBuilder): Promise<void> {
        schema.dropTable('cache')
    }
}

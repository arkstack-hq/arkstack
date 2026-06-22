import { Migration, SchemaBuilder } from 'arkormx'

/**
 * Backing table for the `database` queue connection (`@arkstack/queue`).
 *
 * Columns: `id` (auto increment), `queue` (string, indexed), `payload` (text),
 * `attempts` (int), `reserved_at` (nullable epoch seconds), `available_at`
 * (epoch seconds), `created_at` (epoch seconds). Adjust the table name to match
 * `queue.connections.database.table`.
 */
export default class CreateJobsTableMigration extends Migration {
    public async up (schema: SchemaBuilder): Promise<void> {
        schema.createTable('jobs', (table) => {
            table.id('id')
            table.string('queue').index()
            table.text('payload')
            table.integer('attempts')
            table.integer('reserved_at').nullable()
            table.integer('available_at')
            table.integer('created_at')
        })
    }

    public async down (schema: SchemaBuilder): Promise<void> {
        schema.dropTable('jobs')
    }
}

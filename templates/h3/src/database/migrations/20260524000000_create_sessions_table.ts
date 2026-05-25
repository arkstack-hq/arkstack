import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateSessionsTableMigration extends Migration {
    public async up (schema: SchemaBuilder): Promise<void> {
        schema.createTable('sessions', (table) => {
            table.string('id').primary()
            table.text('payload')
            table.date('expiresAt').nullable().map('expires_at')
            table.timestamps()
        })
    }

    public async down (schema: SchemaBuilder): Promise<void> {
        schema.dropTable('sessions')
    }
}

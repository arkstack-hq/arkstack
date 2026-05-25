import { Migration, SchemaBuilder } from 'arkormx'

export default class CreatePasswordResetsTableMigration extends Migration {
    public async up (schema: SchemaBuilder): Promise<void> {
        schema.createTable('password_resets', (table) => {
            table.id('id', 'uuid').primary()
            table.string('email').nullable().index()
            table.string('phone').nullable().index()
            table.string('token')
            table.timestamps()
        })
    }

    public async down (schema: SchemaBuilder): Promise<void> {
        schema.dropTable('password_resets')
    }
}

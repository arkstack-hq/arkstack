import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateUsersTableMigration extends Migration {
    public async up (schema: SchemaBuilder): Promise<void> {
        schema.createTable('users', (table) => {
            table.id('id', 'uuid').primary()
            table.string('email').unique().index()
            table.string('password')
            table.string('name')
            table.timestamps()
        })
    }

    public async down (schema: SchemaBuilder): Promise<void> {
        schema.dropTable('users')
    }
}
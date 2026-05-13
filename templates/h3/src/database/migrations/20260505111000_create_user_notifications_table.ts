import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateUserNotificationsTableMigration extends Migration {
    public async up (schema: SchemaBuilder): Promise<void> {
        schema.createTable('user_notifications', (table) => {
            table.id()
            table.bigInteger('userId').map('user_id')
                .foreign().references('users', 'id').onDelete('cascade').as('user').inverseAlias('notifications')
            table.string('type').nullable()
            table.string('title')
            table.text('description')
            table.string('actionText').nullable().map('action_text')
            table.string('actionLink').nullable().map('action_link')
            table.json('meta').nullable()
            table.date('readAt').nullable().map('read_at')
            table.timestamps()
            table.index(['userId'])
        })
    }

    public async down (schema: SchemaBuilder): Promise<void> {
        schema.dropTable('user_notifications')
    }
}

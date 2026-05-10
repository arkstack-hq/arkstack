import { Migration, SchemaBuilder } from 'arkormx'

export default class CreatePersonAccessTokensTableMigration extends Migration {
    public async up (schema: SchemaBuilder): Promise<void> {
        schema.createTable('personal_access_tokens', (table) => {
            table.id('id', 'uuid').primary()
            table.uuid('userId').map('user_id')
                .foreign().references('users', 'id').onDelete('cascade').as('user').inverseAlias('personalAccessTokens')
            table.string('name')
            table.text('token').unique()
            table.json('abilities').nullable()
            table.json('deviceInfo').nullable().map('device_info')
            table.date('lastUsedAt').nullable().map('last_used_at')
            table.date('expiresAt').nullable().map('expires_at')
            table.timestamps()
            table.index(['userId'])
        })
    }

    public async down (schema: SchemaBuilder): Promise<void> {
        schema.dropTable('personal_access_tokens')
    }
} 

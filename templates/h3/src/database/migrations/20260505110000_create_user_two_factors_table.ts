import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateUserTwoFactorsTableMigration extends Migration {
    public async up (schema: SchemaBuilder): Promise<void> {
        schema.createTable('user_two_factors', (table) => {
            table.id()
            table.bigInteger('userId').map('user_id')
                .foreign().references('users', 'id').onDelete('cascade').as('user').inverseAlias('twoFactor')
            table.enum('method', ['authenticator', 'sms']).nullable().enumName('TwoFactorMethod')
            table.string('secretCiphertext').nullable().map('secret_ciphertext')
            table.string('smsCodeHash').nullable().map('sms_code_hash')
            table.date('smsCodeExpiresAt').nullable().map('sms_code_expires_at')
            table.string('smsCodePurpose').nullable().map('sms_code_purpose')
            table.date('enabledAt').nullable().map('enabled_at')
            table.json('recoveryCodeHashes').nullable().map('recovery_code_hashes')
            table.timestamps()
            table.index(['userId'])
        })
    }

    public async down (schema: SchemaBuilder): Promise<void> {
        schema.dropTable('user_two_factors')
    }
}

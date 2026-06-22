import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import { Arkstack } from '@arkstack/contract'
import { Command } from '@h3ravel/musket'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'

/**
 * Generate and set the application key (APP_KEY).
 *
 * APP_KEY is the unified secret used for signing JWTs and encrypting values
 * across the framework (exposed as `config('app.key')`).
 */
export class KeyGenerateCommand extends Command {
    protected signature = `key:generate
        {--show : Display the generated key instead of writing it to the .env file.}
        {--force : Overwrite the existing APP_KEY without confirmation.}
    `

    protected description = 'Set the application key (APP_KEY).'

    async handle () {
        const key = this.generateKey()

        if (this.option('show')) {
            return void this.line(key)
        }

        const envPath = join(Arkstack.rootDir(), '.env')

        if (!existsSync(envPath)) {
            return void this.error(
                'No .env file found. Copy .env.example to .env before running key:generate.',
            )
        }

        const contents = readFileSync(envPath, 'utf-8')
        const existing = contents.match(/^APP_KEY=(.*)$/m)

        if (existing?.[1]?.trim() && !this.option('force')) {
            const confirmed = await this.confirm(
                'An application key already exists. Overwrite it?',
                false,
            )

            if (!confirmed) {
                return void this.info('Application key generation aborted.')
            }
        }

        const next = existing
            ? contents.replace(/^APP_KEY=.*$/m, `APP_KEY=${key}`)
            : `${contents.replace(/\s*$/, '')}\nAPP_KEY=${key}\n`

        writeFileSync(envPath, next)

        this.success('Application key set successfully.')
    }

    private generateKey (): string {
        // URL-safe base64 so the value is safe to drop into .env unquoted.
        return randomBytes(32).toString('base64url')
    }
}

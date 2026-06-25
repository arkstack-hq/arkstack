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
        {--ignore : Ignore existing APP_KEY without confirmation.}
    `

    protected description = 'Set the application key (APP_KEY).'

    async handle() {
        const key = this.generateKey()
        const ignore = this.option('ignore')

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

        if ((KeyGenerateCommand.hasEnvValue(contents, 'APP_KEY') && !this.option('force')) || ignore) {


            const confirmed = !ignore ? await this.confirm(
                'An application key already exists. Overwrite it?',
                false,
            ) : false

            if (!confirmed || ignore) {
                return void this.info(`Application key generation ${ignore ? 'skipped' : 'aborted'}.`)
            }
        }

        writeFileSync(envPath, KeyGenerateCommand.upsertEnvKey(contents, 'APP_KEY', key))

        this.success('Application key set successfully.')
    }

    private generateKey(): string {
        // URL-safe base64 so the value is safe to drop into .env unquoted.
        return randomBytes(32).toString('base64url')
    }



    /**
     * Whether the env file defines a non-empty value for `name`.
     *
     * An empty assignment (`APP_KEY=`), whitespace, or empty quotes (`APP_KEY=""`)
     * all count as "not set" so a placeholder line is never mistaken for a real key.
     *
     * @param contents  The raw `.env` contents.
     * @param name      The variable name.
     */
    static hasEnvValue = (contents: string, name: string): boolean => {
        const match = contents.match(new RegExp(`^${name}=(.*)$`, 'm'))
        const value = match?.[1]
            ?.trim()
            .replace(/^(["'])(.*)\1$/, '$2')
            .trim()

        return Boolean(value)
    }

    /**
     * Return `contents` with `name` set to `value`, replacing the line in place if
     * it exists or appending it otherwise.
     *
     * @param contents  The raw `.env` contents.
     * @param name      The variable name.
     * @param value     The value to set.
     */
    static upsertEnvKey = (contents: string, name: string, value: string): string => {
        const line = `${name}=${value}`
        const pattern = new RegExp(`^${name}=.*$`, 'm')

        // Function replacer so the value is inserted verbatim (no `$` specials).
        if (pattern.test(contents)) {
            return contents.replace(pattern, () => line)
        }

        return `${contents.replace(/\s*$/, '')}\n${line}\n`
    }
}

import { mkdir, readFile, readdir, rm, unlink, writeFile } from 'node:fs/promises'

import { FilePayload } from '../types'
import { Store } from '../Contracts/Store'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'

/**
 * A cache store that persists each entry as a JSON file on disk.
 *
 * Keys are hashed to produce safe, fixed length file names. Expired files are
 * removed lazily on read and ignored otherwise.
 */
export class FileStore extends Store {
    constructor(
        private readonly directory: string,
        private readonly prefix = '',
    ) {
        super()
    }

    getPrefix (): string {
        return this.prefix
    }

    private pathFor (key: string): string {
        const hash = createHash('sha1').update(this.prefix + key).digest('hex')

        return path.join(this.directory, `${hash}.json`)
    }

    private async ensureDirectory (): Promise<void> {
        if (!existsSync(this.directory)) {
            await mkdir(this.directory, { recursive: true })
        }
    }

    async get<T = unknown> (key: string): Promise<T | null> {
        const file = this.pathFor(key)

        if (!existsSync(file)) {
            return null
        }

        try {
            const payload = JSON.parse(await readFile(file, 'utf8'))

            if (payload.expiresAt !== null && payload.expiresAt <= Date.now()) {
                await unlink(file).catch(() => undefined)

                return null
            }

            return payload.value as T
        } catch {
            return null
        }
    }

    async put (key: string, value: unknown, seconds: number | null = null): Promise<boolean> {
        await this.ensureDirectory()

        const payload: FilePayload = {
            value,
            expiresAt: seconds === null ? null : Date.now() + seconds * 1000,
        }

        await writeFile(this.pathFor(key), JSON.stringify(payload), 'utf8')

        return true
    }

    async forever (key: string, value: unknown): Promise<boolean> {
        return this.put(key, value, null)
    }

    async increment (key: string, value = 1): Promise<number | false> {
        const current = await this.get(key)
        const base = current === null ? 0 : current

        if (typeof base !== 'number' || Number.isNaN(base)) {
            return false
        }

        const next = base + value

        // Preserve the existing expiry when incrementing an existing entry.
        const file = this.pathFor(key)
        let expiresAt: number | null = null

        if (existsSync(file)) {
            try {
                expiresAt = (JSON.parse(await readFile(file, 'utf8'))).expiresAt
            } catch {
                expiresAt = null
            }
        }

        await this.ensureDirectory()
        await writeFile(file, JSON.stringify({ value: next, expiresAt }), 'utf8')

        return next
    }

    async decrement (key: string, value = 1): Promise<number | false> {
        return this.increment(key, -value)
    }

    async forget (key: string): Promise<boolean> {
        const file = this.pathFor(key)

        if (!existsSync(file)) {
            return false
        }

        await unlink(file).catch(() => undefined)

        return true
    }

    async flush (): Promise<boolean> {
        if (!existsSync(this.directory)) {
            return true
        }

        const files = await readdir(this.directory)

        await Promise.all(
            files
                .filter((name) => name.endsWith('.json'))
                .map((name) => rm(path.join(this.directory, name), { force: true })),
        )

        return true
    }
}

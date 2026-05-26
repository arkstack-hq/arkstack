import { BaseSessionDriverOptions, HttpContextLike, SessionDriverResult, SessionPayload } from '../types'
import { dirname, join } from 'node:path'
import { generateSessionId, setCookie } from '../cookie'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'

import { BaseSessionDriver } from './BaseSessionDriver'

export class FileSessionDriver extends BaseSessionDriver {
    readonly directory: string

    constructor(options: BaseSessionDriverOptions & { directory?: string } = {}) {
        super(options)
        this.directory =
            options.directory ||
            join(process.cwd(), 'storage', 'framework', 'sessions')
    }

    private path (id: string) {
        return join(this.directory, `${id}.json`)
    }

    async start (context: HttpContextLike): Promise<SessionDriverResult> {
        const id = this.readSessionId(context) || generateSessionId()
        this.writeSessionId(context, id)
        let state: SessionPayload | undefined
        try {
            const contents = await readFile(this.path(id), 'utf8')
            const payload = this.decryptPayload(contents) ?? contents
            state = JSON.parse(payload) as SessionPayload
        } catch {
            state = undefined
        }

        const save = async (payload: SessionPayload) => {
            const path = this.path(id)
            await mkdir(dirname(path), { recursive: true })
            await writeFile(path, this.encryptPayload(JSON.stringify(payload)), 'utf8')
            this.writeSessionId(context, id)
        }

        const destroy = async () => {
            await rm(this.path(id), { force: true })
            setCookie(context, this.cookie, '', {
                ...this.cookie_options,
                maxAge: 0,
                expires: new Date(0),
            })
        }

        return { id, state, save, destroy }
    }
}
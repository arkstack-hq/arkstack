import { DatabaseSessionDriverOptions, HttpContextLike, SessionDriverResult, SessionPayload } from '../types'
import { decodeJson, generateSessionId, setCookie } from '../cookie'
import { decodeSessionPayload, encodeSessionPayload } from '../serialization'

import { BaseSessionDriver } from './BaseSessionDriver'
import { isRecord } from '../../helpers'

export class DatabaseSessionDriver extends BaseSessionDriver {
    readonly tableName: string

    constructor(options: DatabaseSessionDriverOptions = {}) {
        super(options)
        this.tableName = options.table || 'sessions'
    }

    async start(context: HttpContextLike): Promise<SessionDriverResult> {
        const { DB } = await import('arkormx')
        const table = () => DB.table(this.tableName)

        const id = this.readSessionId(context) || generateSessionId()
        this.writeSessionId(context, id)

        const row = await table().where({ id }).first()
        const state = isRecord(row) && typeof row.payload === 'string'
            ? decodeSessionPayload<SessionPayload>(this.decryptPayload(row.payload) ?? row.payload) ?? decodeJson<SessionPayload>(this.decryptPayload(row.payload) ?? row.payload)
            : isRecord(row?.payload)
                ? (row.payload as SessionPayload)
                : undefined

        const save = async (payload: SessionPayload) => {
            const now = new Date()
            const values = {
                id,
                payload: this.encryptPayload(encodeSessionPayload(payload)),
                updatedAt: now,
                expiresAt: this.ttl ? new Date(now.getTime() + this.ttl * 1000) : null,
            }
            const existing = await table().where({ id }).first()
            if (existing) await table().where({ id }).update(values)
            else await table().insert({ ...values, createdAt: now })
            this.writeSessionId(context, id)
        }

        const destroy = async () => {
            await table().where({ id }).delete()
            setCookie(context, this.cookie, '', {
                ...this.cookie_options,
                maxAge: 0,
                expires: new Date(0),
            })
        }

        return { id, state, save, destroy }
    }
}
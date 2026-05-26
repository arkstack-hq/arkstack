import { DatabaseSessionDriverOptions, HttpContextLike, SessionDriverResult, SessionPayload } from '../types'
import { decodeJson, encodeJson, generateSessionId, setCookie } from '../cookie'

import { BaseSessionDriver } from './BaseSessionDriver'
import { DB } from 'arkormx'
import { isRecord } from '../../helpers'

export class DatabaseSessionDriver extends BaseSessionDriver {
    readonly tableName: string

    constructor(options: DatabaseSessionDriverOptions = {}) {
        super(options)
        this.tableName = options.table || 'sessions'
    }

    private table () {
        return DB.table(this.tableName)
    }

    async start (context: HttpContextLike): Promise<SessionDriverResult> {
        const id = this.readSessionId(context) || generateSessionId()
        this.writeSessionId(context, id)

        const row = await this.table().where({ id }).first()
        const state = isRecord(row) && typeof row.payload === 'string'
            ? decodeJson<SessionPayload>(this.decryptPayload(row.payload) ?? row.payload)
            : isRecord(row?.payload)
                ? (row.payload as SessionPayload)
                : undefined

        const save = async (payload: SessionPayload) => {
            const now = new Date()
            const values = {
                id,
                payload: this.encryptPayload(encodeJson(payload)),
                updatedAt: now,
                expiresAt: this.ttl ? new Date(now.getTime() + this.ttl * 1000) : null,
            }
            const existing = await this.table().where({ id }).first()
            if (existing) await this.table().where({ id }).update(values)
            else await this.table().insert({ ...values, createdAt: now })
            this.writeSessionId(context, id)
        }

        const destroy = async () => {
            await this.table().where({ id }).delete()
            setCookie(context, this.cookie, '', {
                ...this.cookie_options,
                maxAge: 0,
                expires: new Date(0),
            })
        }

        return { id, state, save, destroy }
    }
}
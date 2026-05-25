import { HttpContextLike, SessionDriverResult, SessionPayload } from '../types'
import { decodeJson, decodeSignedValue, encodeJson, encodeSignedValue, generateSessionId, getCookie, setCookie } from '../cookie'

import { BaseSessionDriver } from './BaseSessionDriver'

export class CookieSessionDriver extends BaseSessionDriver {
    async start (context: HttpContextLike): Promise<SessionDriverResult> {
        const decoded = decodeSignedValue(
            getCookie(context, this.cookie),
            this.secret,
        )
        const payload = decodeJson<SessionPayload & { id?: string }>(decoded)
        const id = payload?.id || generateSessionId()
        const state = payload
            ? { data: payload.data, errors: payload.errors }
            : undefined
        const save = async (next: SessionPayload) => {
            setCookie(
                context,
                this.cookie,
                encodeSignedValue(encodeJson({ id, ...next }), this.secret),
                this.cookie_options,
            )
        }
        const destroy = async () => {
            setCookie(context, this.cookie, '', {
                ...this.cookie_options,
                maxAge: 0,
                expires: new Date(0),
            })
        }
        await save(state || { data: {}, errors: {} })

        return { id, state, save, destroy }
    }
}
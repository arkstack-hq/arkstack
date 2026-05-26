import { HttpContextLike, SessionDriverResult, SessionPayload } from '../types'
import { decodeJson, decodeSignedValue, encodeJson, generateSessionId, getCookie, setCookie } from '../cookie'

import { BaseSessionDriver } from './BaseSessionDriver'

export class CookieSessionDriver extends BaseSessionDriver {
    async start (context: HttpContextLike): Promise<SessionDriverResult> {
        const cookie = getCookie(context, this.cookie)
        const decoded = this.decryptPayload(cookie) ?? decodeSignedValue(cookie, this.secret)
        const payload = decodeJson<SessionPayload & { id?: string }>(decoded)
        const id = payload?.id || generateSessionId()
        const state = payload
            ? { data: payload.data, errors: payload.errors, flash: payload.flash }
            : undefined
        const save = async (next: SessionPayload) => {
            setCookie(
                context,
                this.cookie,
                this.encryptPayload(encodeJson({ id, ...next })),
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

        return { id, state, save, destroy }
    }
}
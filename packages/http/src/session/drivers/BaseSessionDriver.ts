import { BaseSessionDriverOptions, HttpContextLike, SessionDriver, SessionDriverResult, cookie_options } from '../types'
import { decodeSignedValue, encodeSignedValue, getCookie, setCookie } from '../cookie'
import { decryptSessionValue, encryptSessionValue } from '../encryption'

const defaultSecret = () =>
    String(
        process.env.SESSION_SECRET ||
        process.env.APP_KEY ||
        'arkstack-session-secret',
    )

const defaultcookie_options = (ttl?: number): cookie_options => ({
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ttl,
})

export abstract class BaseSessionDriver implements SessionDriver {
    readonly cookie: string
    readonly secret: string
    readonly ttl?: number
    readonly cookie_options: cookie_options

    constructor(options: BaseSessionDriverOptions = {}) {
        this.cookie = options.cookie || 'arkstack_session'
        this.secret = options.secret || defaultSecret()
        this.ttl = options.ttl
        this.cookie_options = {
            ...defaultcookie_options(options.ttl),
            ...(options.cookie_options || {}),
        }
    }

    protected readSessionId (context: HttpContextLike) {
        return decodeSignedValue(getCookie(context, this.cookie), this.secret)
    }

    protected encryptPayload (value: string) {
        return encryptSessionValue(value, this.secret)
    }

    protected decryptPayload (value: string | undefined) {
        return decryptSessionValue(value, this.secret)
    }

    protected writeSessionId (context: HttpContextLike, id: string) {
        setCookie(
            context,
            this.cookie,
            encodeSignedValue(id, this.secret),
            this.cookie_options,
        )
    }

    abstract start (context: HttpContextLike): Promise<SessionDriverResult>;
}
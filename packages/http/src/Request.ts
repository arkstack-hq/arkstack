import { HeaderMap, RequestOptions, RequestSource } from './types/Http'
import { isRecord, normalizeHeaders, unwrapRequestSource } from './helpers'

import { Request as BaseRequest } from 'clear-router'

/**
 * Represents an HTTP request, providing a consistent interface for accessing request data.
 * 
 * @author 3m1n3nc3
 */
export class Request<TUser = unknown> extends BaseRequest {
    readonly headers: HeaderMap
    readonly ip: string | null
    readonly source?: unknown
    user?: TUser
    authToken?: string

    constructor(options: RequestOptions<TUser> = {}) {
        super(options)

        this.headers = normalizeHeaders(options.headers)
        if (this.method)
            this.method = options.method!
        if (this.url)
            this.url = options.url!
        if (this.path)
            this.path = options.path!
        this.ip = options.ip ?? null
        this.user = options.user
        this.authToken = options.authToken
        this.source = options.source
    }

    static from<TUser = unknown> (
        source?: Request<TUser> | RequestSource<TUser>
    ): Request<TUser> | undefined {
        if (!source) {
            return undefined
        }

        if (source instanceof Request) {
            return source
        }

        const request = unwrapRequestSource(source)

        return new Request<TUser>({
            headers: request.headers,
            method: request.method,
            url: request.originalUrl ?? request.url,
            path: request.path,
            ip: request.ip ?? null,
            user: request.user,
            authToken: request.authToken,
            source,
        })
    }

    header (name: string): string {
        return this.headers[name.toLowerCase()]
    }

    bearerToken (): string | null {
        const authorization = this.header('authorization')

        if (!authorization?.startsWith('Bearer ')) {
            return null
        }

        return authorization.substring(7)
    }

    setUser (user: TUser) {
        this.user = user

        if (isRecord(this.source)) {
            this.source.user = user
        }

        return this
    }
}
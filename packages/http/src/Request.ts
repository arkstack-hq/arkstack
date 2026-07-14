import { HeaderMap, RequestOptions, RequestSource } from './types/Http'
import { isRecord, normalizeHeaders, unwrapRequestSource } from './helpers'

import { Request as BaseRequest } from 'clear-router'
import type { User } from '@app/models/User'

let fallbackRequest: Request<any> | undefined
const requestResolvers = new Set<() => Request<any> | undefined>()

const currentRequest = () => {
    for (const resolver of requestResolvers) {
        const request = resolver()

        if (request) return request
    }

    return fallbackRequest
}

const requestHelper = ((key?: string) => {
    const request = currentRequest()

    return key ? request?.input(key) : request
}) as typeof globalThis.request

export const setRequestResolver = (resolver?: () => Request<any> | undefined) => {
    if (resolver) requestResolvers.add(resolver)
    else requestResolvers.clear()
    globalThis.request = requestHelper
}

const setFallbackRequest = (request: Request<any>) => {
    fallbackRequest = request
    globalThis.request = requestHelper
}

/**
 * Represents an HTTP request, providing a consistent interface for accessing request data.
 * 
 * @author 3m1n3nc3
 */
export class Request<TUser = User> extends BaseRequest {
    readonly headers: HeaderMap
    readonly ip: string | null
    readonly source?: unknown
    private currentUser?: TUser
    private currentAuth?: unknown
    private currentAuthUser?: TUser
    private currentAuthToken?: string

    get user (): TUser | undefined {
        return this.getSourceRequest()?.user ?? this.currentUser
    }

    set user (user: TUser | undefined) {
        this.currentUser = user
    }

    get auth (): unknown {
        return this.getSourceRequest()?.auth ?? this.currentAuth
    }

    set auth (auth: unknown) {
        this.currentAuth = auth
    }

    get authUser (): TUser | undefined {
        return this.getSourceRequest()?.authUser ?? this.currentAuthUser
    }

    set authUser (user: TUser | undefined) {
        this.currentAuthUser = user
    }

    get authToken (): string | undefined {
        return this.getSourceRequest()?.authToken ?? this.currentAuthToken
    }

    set authToken (token: string | undefined) {
        this.currentAuthToken = token
    }

    constructor(options: RequestOptions<TUser> = {}) {
        super(options)

        const source = options.source ?? options.original
        const sourceRequest = isRecord(source)
            ? source as RequestSource<TUser>
            : undefined

        this.headers = normalizeHeaders(options.headers)
        if (this.method)
            this.method = options.method!
        if (this.url)
            this.url = options.url!
        if (this.path)
            this.path = options.path!
        this.ip = options.ip ?? sourceRequest?.ip ?? null
        this.user = options.user ?? sourceRequest?.user
        this.auth = options.auth ?? sourceRequest?.auth
        this.authUser = options.authUser ?? sourceRequest?.authUser
        this.authToken = options.authToken ?? sourceRequest?.authToken
        this.source = source

        setFallbackRequest(this)
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
        const unified = source as RequestSource<TUser> & Partial<Request<TUser>>

        return new Request<TUser>({
            body: unified.body,
            query: unified.query,
            params: unified.params,
            route: unified.route,
            ctx: unified.ctx,
            headers: request.headers,
            method: request.method,
            url: request.originalUrl ?? request.url,
            path: request.path,
            ip: request.ip ?? null,
            user: request.user,
            auth: request.auth,
            authUser: request.authUser,
            authToken: request.authToken,
            source: request,
            original: unified.original,
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

    setAuthentication<TAuth> (auth: TAuth, user: TUser, token?: string) {
        this.auth = auth
        this.authUser = user
        this.authToken = token
        this.setUser(user)

        if (isRecord(this.source)) {
            this.source.auth = auth
            this.source.authUser = user
            this.source.authToken = token
        }

        return this
    }

    syncFromSource () {
        if (!isRecord(this.source)) {
            return this
        }

        const source = this.source as RequestSource<TUser>

        this.user = source.user ?? this.user
        this.auth = source.auth ?? this.auth
        this.authUser = source.authUser ?? this.authUser
        this.authToken = source.authToken ?? this.authToken

        return this
    }

    private getSourceRequest (): RequestSource<TUser> | undefined {
        return isRecord(this.source)
            ? this.source as RequestSource<TUser>
            : undefined
    }

    clearAuthentication () {
        this.auth = undefined
        this.authUser = undefined
        this.authToken = undefined
        this.user = undefined

        if (isRecord(this.source)) {
            this.source.auth = undefined
            this.source.authUser = undefined
            this.source.authToken = undefined
            this.source.user = undefined
        }

        return this
    }
}

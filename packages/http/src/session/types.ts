import type { ErrorBag } from './ErrorBag'

export type SessionDriverType = 'file' | 'cookie' | 'database' | SessionDriver
export type SessionErrorValue = string | string[] | Error | unknown
export type SessionErrorRecord = Record<string, SessionErrorValue>

export interface SessionMessageProvider {
    getMessageBag?: () => SessionMessageProvider
    getMessages?: () => SessionErrorRecord
    messagesRaw?: () => SessionErrorRecord
    toArray?: () => SessionErrorRecord
    all?: (...args: any[]) => SessionErrorRecord | string[]
    errors?: (() => SessionErrorRecord | SessionMessageProvider) | SessionErrorRecord | SessionMessageProvider
}

export type SessionErrorSource = SessionErrorRecord | ErrorBag | SessionMessageProvider

export interface SessionInitialState {
    data?: Record<string, any>
    errors?: SessionErrorSource
}

export type SessionPayload = {
    data?: Record<string, any>
    errors?: SessionErrorRecord
}

export type cookie_options = {
    path?: string
    domain?: string
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'Strict' | 'Lax' | 'None'
    maxAge?: number
    expires?: Date
}

export type HttpContextLike = Record<string, any>

export type SessionDriverResult = {
    id: string
    state?: SessionPayload
    save: (payload: SessionPayload) => void | Promise<void>
    destroy?: () => void | Promise<void>
}

export interface SessionDriver {
    start (context: HttpContextLike): Promise<SessionDriverResult>
}

export type BaseSessionDriverOptions = {
    cookie?: string;
    secret?: string;
    ttl?: number;
    cookie_options?: cookie_options;
};

export type DatabaseSessionDriverOptions = BaseSessionDriverOptions & {
    table?: string;
};

export type PersistentSessionConfig = {
    driver?: SessionDriverType
    cookie?: string
    secret?: string
    ttl?: number
    cookie_options?: cookie_options
    file?: {
        directory?: string
    }
    database?: {
        table?: string
    }
}

export type SessionConfig = {
    secret?: string
    driver?: SessionDriverType
    cookie?: string
    ttl?: number
    http_only?: boolean
    secure?: boolean
    same_site?: cookie_options['sameSite']
    path?: string
    table?: string
    directory?: string
}
import type { ErrorBag } from './ErrorBag'

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

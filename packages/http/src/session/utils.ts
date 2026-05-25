import type { SessionErrorRecord, SessionErrorValue } from './types'

import { isRecord } from '../helpers'

export const defaultErrorKey = '_'
export const sessionKey = Symbol.for('arkstack:http:session')

const asMessageRecord = (value: unknown): SessionErrorRecord | undefined => {
    if (!isRecord(value)) {
        return undefined
    }

    return value as SessionErrorRecord
}

const callRecordMethod = (source: Record<string, any>, method: string): SessionErrorRecord | undefined => {
    if (typeof source[method] !== 'function') {
        return undefined
    }

    const value = source[method]()

    return asMessageRecord(value)
}

export const resolveMessageRecord = (source: unknown): SessionErrorRecord | undefined => {
    if (!isRecord(source)) {
        return undefined
    }

    if (typeof source.getMessageBag === 'function') {
        const bag = source.getMessageBag()

        if (bag && bag !== source) {
            const messages = resolveMessageRecord(bag)

            if (messages) {
                return messages
            }
        }
    }

    if (typeof source.errors === 'function') {
        const errors = source.errors()
        const messages = resolveMessageRecord(errors) || asMessageRecord(errors)

        if (messages) {
            return messages
        }
    }

    return callRecordMethod(source, 'getMessages')
        || callRecordMethod(source, 'messagesRaw')
        || callRecordMethod(source, 'toArray')
        || resolveMessageRecord(source.errors)
        || asMessageRecord(source.errors)
}

export const getValidationIssueField = (issue: Record<string, any>) => {
    if (typeof issue.field === 'string') {
        return issue.field
    }

    if (typeof issue.attribute === 'string') {
        return issue.attribute
    }

    if (typeof issue.key === 'string') {
        return issue.key
    }

    if (typeof issue.path === 'string') {
        return issue.path
    }

    if (Array.isArray(issue.path)) {
        return issue.path.join('.') || defaultErrorKey
    }

    return defaultErrorKey
}

export const toMessages = (value: SessionErrorValue): string[] => {
    if (Array.isArray(value)) {
        return value.flatMap(item => toMessages(item))
    }

    if (value instanceof Error) {
        return [value.message]
    }

    if (isRecord(value) && typeof value.message === 'string') {
        return [value.message]
    }

    if (value === null || typeof value === 'undefined') {
        return []
    }

    return [String(value)]
}

export const getPath = <T = any> (source: Record<string, any>, key: string, defaultValue?: T): T => {
    const value = key.split('.').reduce<any>((current, part) => {
        if (!isRecord(current) && !Array.isArray(current)) {
            return undefined
        }

        return current[part]
    }, source)

    return (typeof value === 'undefined' ? defaultValue : value) as T
}

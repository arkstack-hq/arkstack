import type { SessionErrorRecord, SessionErrorSource, SessionErrorValue } from './types'
import { defaultErrorKey, getValidationIssueField, resolveMessageRecord, toMessages } from './utils'

import { isRecord } from '../helpers'

export class ErrorBag {
    private bag: Record<string, string[]> = {}

    constructor(errors?: SessionErrorSource) {
        if (errors) {
            this.merge(errors)
        }
    }

    add (field: string, message: SessionErrorValue) {
        const key = field || defaultErrorKey
        const messages = toMessages(message)

        if (!messages.length) {
            return this
        }

        this.bag[key] = [
            ...(this.bag[key] || []),
            ...messages,
        ]

        return this
    }

    addIf (condition: boolean, field: string, message: SessionErrorValue) {
        if (condition) {
            this.add(field, message)
        }

        return this
    }

    merge (errors: SessionErrorSource) {
        const incoming = resolveMessageRecord(errors) || (isRecord(errors) ? errors as SessionErrorRecord : undefined)

        if (!incoming) {
            return this.validation(errors)
        }

        for (const [field, messages] of Object.entries(incoming)) {
            this.add(field, messages)
        }

        return this
    }

    validation (error: unknown): ErrorBag {
        if (!error) {
            return this
        }

        if (error instanceof ErrorBag) {
            return this.merge(error)
        }

        const messages = resolveMessageRecord(error)

        if (messages) {
            return this.merge(messages)
        }

        if (Array.isArray(error)) {
            for (const item of error) {
                if (isRecord(item) && 'message' in item) {
                    this.add(getValidationIssueField(item), item.message)
                } else {
                    this.add(defaultErrorKey, item)
                }
            }

            return this
        }

        if (isRecord(error)) {
            if (typeof error.errors === 'function') {
                return this.validation(error.errors())
            }

            if (error.errors) {
                return this.validation(error.errors)
            }

            if (Array.isArray(error.issues)) {
                return this.validation(error.issues)
            }

            if ('message' in error) {
                return this.add(getValidationIssueField(error), error.message)
            }

            return this.merge(error as SessionErrorRecord)
        }

        if (error instanceof Error) {
            return this.add(defaultErrorKey, error.message)
        }

        return this.add(defaultErrorKey, error)
    }

    keys () {
        return Object.keys(this.bag)
    }

    get (field: string = defaultErrorKey) {
        return [...(this.bag[field] || [])]
    }

    first (field?: string | null) {
        if (field) {
            return this.bag[field]?.[0] || ''
        }

        return this.all()[0] || ''
    }

    has (field?: string | string[] | null): boolean {
        if (Array.isArray(field)) {
            return field.every(key => this.has(key))
        }

        if (field) {
            return (this.bag[field]?.length || 0) > 0
        }

        return this.any()
    }

    hasAny (fields: string | string[]) {
        const keys = Array.isArray(fields) ? fields : [fields]

        return keys.some(key => this.has(key))
    }

    missing (fields: string | string[]) {
        const keys = Array.isArray(fields) ? fields : [fields]

        return keys.every(key => !this.has(key))
    }

    any () {
        return Object.values(this.bag).some(messages => messages.length > 0)
    }

    isEmpty () {
        return !this.any()
    }

    isNotEmpty () {
        return this.any()
    }

    count () {
        return Object.values(this.bag).reduce((total, messages) => total + messages.length, 0)
    }

    all () {
        return Object.values(this.bag).flat()
    }

    unique () {
        return [...new Set(this.all())]
    }

    clear (field?: string | string[]) {
        if (Array.isArray(field)) {
            for (const key of field) {
                delete this.bag[key]
            }

            return this
        }

        if (field) {
            delete this.bag[field]

            return this
        }

        this.bag = {}

        return this
    }

    forget (field: string) {
        return this.clear(field)
    }

    messagesRaw () {
        return this.toJSON()
    }

    getMessages () {
        return this.messagesRaw()
    }

    getMessageBag () {
        return this
    }

    toArray () {
        return this.toJSON()
    }

    toJSON () {
        return Object.entries(this.bag).reduce<Record<string, string[]>>((errors, [field, messages]) => {
            errors[field] = [...messages]

            return errors
        }, {})
    }
}

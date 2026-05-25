import { ViewErrorRecord, ViewErrorValue } from './types'
import { getMessageRecord, isRecord, toMessages } from './helpers'

const defaultErrorKey = '_'

export class ViewErrorBag {
    private bag: Record<string, string[]> = {}

    constructor(errors?: ViewErrorRecord | ViewErrorBag | unknown) {
        if (errors) {
            this.merge(errors)
        }
    }

    add (field: string, message: ViewErrorValue) {
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

    merge (errors: ViewErrorRecord | ViewErrorBag | unknown) {
        const incoming = errors instanceof ViewErrorBag
            ? errors.toJSON()
            : getMessageRecord(errors) || (isRecord(errors) ? errors as ViewErrorRecord : undefined)

        if (!incoming) {
            return this
        }

        for (const [field, messages] of Object.entries(incoming)) {
            this.add(field, messages)
        }

        return this
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

export const isViewErrorBag = (value: unknown): value is Pick<ViewErrorBag, 'all' | 'first' | 'get' | 'has'> => {
    return isRecord(value)
        && typeof value.all === 'function'
        && typeof value.first === 'function'
        && typeof value.get === 'function'
        && typeof value.has === 'function'
}

export const normalizeViewErrors = (errors?: unknown) => {
    if (isViewErrorBag(errors)) {
        return errors
    }

    return new ViewErrorBag(errors)
}

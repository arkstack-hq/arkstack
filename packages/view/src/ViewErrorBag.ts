export type ViewErrorValue = string | string[] | Error | { message?: unknown } | unknown
export type ViewErrorRecord = Record<string, ViewErrorValue>

const defaultErrorKey = '_'

const isRecord = (value: unknown): value is Record<string, any> => {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}

const toMessages = (value: ViewErrorValue): string[] => {
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

const getMessageRecord = (source: unknown): ViewErrorRecord | undefined => {
    if (!isRecord(source)) {
        return undefined
    }

    if (typeof source.getMessageBag === 'function') {
        const bag = source.getMessageBag()

        if (bag && bag !== source) {
            const messages = getMessageRecord(bag)

            if (messages) {
                return messages
            }
        }
    }

    for (const method of ['getMessages', 'messagesRaw', 'toArray']) {
        if (typeof source[method] === 'function') {
            const messages = source[method]()

            if (isRecord(messages)) {
                return messages
            }
        }
    }

    if (typeof source.errors === 'function') {
        const errors = source.errors()
        const messages = getMessageRecord(errors) || (isRecord(errors) ? errors : undefined)

        if (messages) {
            return messages
        }
    }

    return getMessageRecord(source.errors) || (isRecord(source.errors) ? source.errors : undefined)
}

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

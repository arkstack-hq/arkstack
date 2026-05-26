import type { SessionPayload } from './types'

const byteLength = (value: string) => Buffer.byteLength(value, 'utf8')

const serializeValue = (value: unknown): string => {
    if (value === null || typeof value === 'undefined') {
        return 'N;'
    }

    if (typeof value === 'boolean') {
        return `b:${value ? 1 : 0};`
    }

    if (typeof value === 'number') {
        return Number.isInteger(value) ? `i:${value};` : `d:${value};`
    }

    if (typeof value === 'string') {
        return `s:${byteLength(value)}:"${value}";`
    }

    if (Array.isArray(value)) {
        return serializeEntries(value.map((item, index) => [index, item]))
    }

    if (typeof value === 'object') {
        return serializeEntries(Object.entries(value as Record<string, unknown>))
    }

    return serializeValue(String(value))
}

const serializeEntries = (entries: Array<[string | number, unknown]>) => {
    return `a:${entries.length}:{${entries.map(([key, value]) => serializeValue(key) + serializeValue(value)).join('')}}`
}

class Parser {
    private offset = 0

    constructor(private readonly source: string) { }

    parse (): unknown {
        const type = this.source[this.offset]
        this.offset += type === 'N' ? 1 : 2

        switch (type) {
            case 'N':
                this.expect(';')

                return null
            case 'b':
                return this.readUntil(';') === '1'
            case 'i':
                return Number.parseInt(this.readUntil(';'), 10)
            case 'd':
                return Number.parseFloat(this.readUntil(';'))
            case 's':
                return this.parseString()
            case 'a':
                return this.parseArray()
            default:
                throw new Error(`Unsupported serialized session value: ${type}`)
        }
    }

    private parseString () {
        const length = Number.parseInt(this.readUntil(':'), 10)
        this.expect('"')
        let end = this.offset
        let bytes = 0

        while (end < this.source.length && bytes < length) {
            const char = this.source[end]
            bytes += Buffer.byteLength(char, 'utf8')
            end += 1
        }

        const value = this.source.slice(this.offset, end)
        this.offset = end
        this.expect('"')
        this.expect(';')

        return value
    }

    private parseArray () {
        const length = Number.parseInt(this.readUntil(':'), 10)
        this.expect('{')
        const entries: Array<[string | number, unknown]> = []
        let sequential = true

        for (let index = 0; index < length; index += 1) {
            const key = this.parse() as string | number
            const value = this.parse()
            entries.push([key, value])

            if (key !== index) {
                sequential = false
            }
        }

        this.expect('}')

        if (sequential) {
            return entries.map(([, value]) => value)
        }

        return entries.reduce<Record<string, unknown>>((record, [key, value]) => {
            record[String(key)] = value

            return record
        }, {})
    }

    private readUntil (token: string) {
        const index = this.source.indexOf(token, this.offset)

        if (index < 0) {
            throw new Error('Invalid serialized session payload')
        }

        const value = this.source.slice(this.offset, index)
        this.offset = index + token.length

        return value
    }

    private expect (token: string) {
        if (this.source.slice(this.offset, this.offset + token.length) !== token) {
            throw new Error('Invalid serialized session payload')
        }

        this.offset += token.length
    }
}

export const encodeSessionPayload = (
    payload: SessionPayload & { id?: string },
) => {
    return serializeValue(payload)
}

const normalizeSessionPayload = (payload: unknown) => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return payload
    }

    const record = payload as Record<string, unknown>

    for (const key of ['data', 'errors', 'flash']) {
        if (Array.isArray(record[key]) && record[key].length === 0) {
            record[key] = {}
        }
    }

    return record
}

export const decodeSessionPayload = <
    T extends SessionPayload & { id?: string } = SessionPayload & { id?: string },
> (
    value: string | undefined,
): T | undefined => {
    if (!value) {
        return undefined
    }

    try {
        return normalizeSessionPayload(new Parser(value).parse()) as T
    } catch {
        return undefined
    }
}

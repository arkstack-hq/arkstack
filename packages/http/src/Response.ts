import { HeaderSource, ResponseSource } from './types/Http'
import { isRecord, makeHeaders, normalizeHeaders } from './helpers'

import { Response as BaseResponse } from 'clear-router'
import { RequestData } from 'clear-router/types/basic'

/**
 * Represents an HTTP response, providing a consistent interface for accessing response data.
 * 
 * @author 3m1n3nc3
 */
export class Response<TBody = unknown> extends BaseResponse {
    override body: TBody
    readonly source?: unknown

    constructor(options: {
        statusCode?: number;
        headers?: HeaderSource;
        body?: TBody;
        source?: unknown;
    } = {}) {
        super({
            body: options.body,
            headers: makeHeaders(options.headers),
            statusCode: options.statusCode ?? 200,
        })

        this.body = options.body ?? {} as TBody
        this.source = options.source

        globalThis.response = () => this
    }

    static from<TBody extends RequestData = RequestData> (
        source?: Response<TBody> | ResponseSource
    ): Response<TBody> | undefined {
        if (!source) {
            return undefined
        }

        if (source instanceof Response) {
            return source
        }

        return new Response<TBody>({
            statusCode: typeof source.status === 'number' ? source.status : source.statusCode,
            headers: source.headers,
            source,
        })
    }

    status (code: number) {
        this.statusCode = code

        if (isRecord(this.source)) {
            if (typeof this.source.status === 'function') {
                this.source.status(code)
            } else {
                this.source.statusCode = code
            }
        }

        return this
    }

    header (name: string, value: string) {
        this.headers.set(name.toLowerCase(), value)

        if (isRecord(this.source) && typeof this.source.setHeader === 'function') {
            this.source.setHeader(name, value)
        }

        return this
    }

    getHeaders () {
        return normalizeHeaders(this.headers)
    }

    json (body: TBody) {
        this.body = body

        if (isRecord(this.source) && typeof this.source.json === 'function') {
            return this.source.json(body)
        }

        return body
    }

    send (body: TBody) {
        this.body = body

        if (isRecord(this.source) && typeof this.source.send === 'function') {
            return this.source.send(body)
        }

        return body
    }
}
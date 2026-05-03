import { Request, Response, type RequestSource, type ResponseSource } from '@arkstack/http'

import { Exception } from '@arkstack/common'

export class AuthenticationException extends Exception {
    #errors?: Record<string, any>
    #request?: Request
    #response?: Response
    statusCode: number = 401
    name: string

    constructor(
        message: string = 'Authentication failed',
        ctx?: {
            req?: Request | RequestSource,
            res?: Response | ResponseSource,
            status?: number,
            errors?: Record<string, any>
        }
    ) {
        super(message)
        this.name = 'AuthenticationException'
        this.statusCode = ctx?.status ?? 401
        if (ctx) {
            this.#request = Request.from(ctx.req)
            this.#response = Response.from(ctx.res)
            this.#errors = ctx.errors
        }

        void this.#response
        void this.#request
    }

    errors (): Record<string, any> | undefined {
        return this.#errors
    }
}

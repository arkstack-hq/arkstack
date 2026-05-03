import { Exception } from '@arkstack/common'

// TODO: Make this more specific to H3, maybe by including the request and response objects, or by accepting an H3Event instead of a generic options object.
type Options = {
    message: string,
    statusCode?: number
}

export class RateLimitExceededException extends Exception {
    statusCode: number = 429
    name: string

    constructor(options: Options) {
        super(options.message)
        this.name = 'RateLimitExceededException'
        this.statusCode = options.statusCode ?? 429
    }
}
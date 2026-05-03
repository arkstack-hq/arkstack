import { Exception } from '@arkstack/common'
import { Options } from 'express-rate-limit'

export class RateLimitExceededException extends Exception {
    statusCode: number = 429
    name: string

    constructor(options: Options) {
        super(options.message)
        this.name = 'RateLimitExceededException'
        this.statusCode = options.statusCode ?? 429
    }
}
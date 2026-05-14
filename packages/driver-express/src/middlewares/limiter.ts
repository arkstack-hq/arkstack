import { ValueDeterminingMiddleware, rateLimit } from 'express-rate-limit'

import { RateLimitExceededException } from '../Exceptions/RateLimitExceededException'
import { env } from '@arkstack/common'

/**
 *  create a rate limiter middleware
 * 
 * @param requests   number of requests allowed per windowMs
 * @param perMin     number of minutes for the window
 * @param message    custom message to be returned when rate limit is exceeded
 * @returns 
 */
export const limiter = (
    requests: number | ValueDeterminingMiddleware<number> = 100,
    perSec: number = 900,
    message?: string | ValueDeterminingMiddleware<string>
) => rateLimit({
    message,
    limit: requests, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    windowMs: (env('NODE_ENV') === 'production' ? perSec : 30) * 1000, // 15 minutes
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
    handler: (_, __, ___, options) => {
        throw new RateLimitExceededException(options)
    }
})
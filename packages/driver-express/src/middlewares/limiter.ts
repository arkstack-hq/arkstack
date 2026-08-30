import { ValueDeterminingMiddleware, rateLimit } from 'express-rate-limit'

import { RateLimitExceededException } from '../Exceptions/RateLimitExceededException'
import { env } from '@arkstack/common'

/**
 * Create a rate limiter middleware
 * 
 * A limiter translates to [Allow N `(requests)` per N seconds `(windowSeconds)` per IP], or
 * more explicitly `Allow 100 requests per 30 seconds per IP.`
 * 
 * @param requests          number of requests allowed per `windowSeconds`
 * @param windowSeconds     number of seconds for the window
 * @param message           custom message to be returned when rate limit is exceeded
 * @returns 
 */
export const limiter = (
    requests: number | ValueDeterminingMiddleware<number> = 100,
    windowSeconds: number = 900,
    message?: string | ValueDeterminingMiddleware<string>
) => {
    /** 15 minutes default in production */
    const windowMs = (env('NODE_ENV') === 'production' ? windowSeconds : 30) * 1000

    return rateLimit({
        message,
        limit: requests, // Limit each IP to N requests per `window` (here, per 15 minutes)
        windowMs,
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
        handler: (_, __, ___, options) => {
            throw new RateLimitExceededException(options)
        }
    })
}
import type { FastifyPluginEntry } from '../types'
import type { RateLimitPluginOptions } from '@fastify/rate-limit'
import { RateLimitExceededException } from '../Exceptions/RateLimitExceededException'
import { env } from '@arkstack/common'
import fastifyRateLimit from '@fastify/rate-limit'

/**
 * Creates a rate limiter plugin entry for the driver's `plugins` option.
 *
 * A limiter translates to [Allow N `(requests)` per N seconds `(windowSeconds)` per IP], or
 * more explicitly `Allow 100 requests per 30 seconds per IP.`
 *
 * @param requests          number of requests allowed per `windowSeconds`
 * @param windowSeconds     number of seconds for the window
 * @param message           custom message returned when the limit is exceeded
 * @returns
 */
export const limiter = (
  requests: RateLimitPluginOptions['max'] = 100,
  windowSeconds: number = 900,
  message?: string,
): FastifyPluginEntry => {
  const timeWindow = (env('NODE_ENV') === 'production' ? windowSeconds : 30) * 1000

  return [
    fastifyRateLimit,
    {
      max: requests,
      timeWindow,
      errorResponseBuilder: (_req: unknown, context: { statusCode: number }) => {
        return new RateLimitExceededException(message, context.statusCode)
      },
    } satisfies RateLimitPluginOptions,
  ]
}

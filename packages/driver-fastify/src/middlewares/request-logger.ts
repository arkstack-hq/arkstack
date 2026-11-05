import type { FastifyReply, FastifyRequest } from 'fastify'
import { Logger, nodeEnv } from '@arkstack/common'

const colors: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'cyan'> = {
  GET: 'green',
  POST: 'blue',
  PUT: 'yellow',
  DELETE: 'red',
  PATCH: 'cyan',
}

/**
 * Logs each finished request with its status and response time. Register it
 * in the `after` middleware position.
 *
 * @param config
 * @param config.allowInProduction Also log in production. Defaults to false.
 * @returns
 */
export const requestLogger =
  ({ allowInProduction = false }: { allowInProduction?: boolean } = {}) =>
  async (req: FastifyRequest, reply: FastifyReply) => {
    const VERBOSE = process.env.VERBOSITY != '0'

    if ((nodeEnv() === 'prod' && !allowInProduction) || !VERBOSE) return
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) return

    const status = reply.statusCode || 200
    const duration = Math.round(reply.elapsedTime * 100) / 100

    Logger.log(
      [
        [`[${req.method}]`, colors[req.method] || 'white'],
        [req.url, 'cyan'],
        [status.toString(), status >= 500 ? 'red' : status >= 400 ? 'yellow' : 'green'],
        [`- ${duration}ms`, 'dim'],
      ],
      ' ',
    )
  }

export class RequestLoggerMiddleware {
  constructor(private options: { allowInProduction?: boolean } = {}) {}

  handle(req: FastifyRequest, reply: FastifyReply) {
    return requestLogger(this.options)(req, reply)
  }
}

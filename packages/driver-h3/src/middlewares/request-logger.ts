import { Logger, nodeEnv } from '@arkstack/common'

import { H3Middleware } from '..'

const colors: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'cyan'> = {
    GET: 'green',
    POST: 'blue',
    PUT: 'yellow',
    DELETE: 'red',
    PATCH: 'cyan',
}

/**
 * Middleware to log incoming requests and their response times.
 * 
 * @param config Configuration options for the request logger middleware.
 * @param config.allowInProduction If true, the logger will also log requests in production environment. Default is false. 
 * @returns H3Middleware function
 */
export const requestLogger = ({
    allowInProduction = false,
}: {
    allowInProduction?: boolean
} = {}): H3Middleware => async (event, next) => {
    if (nodeEnv() === 'prod' && !allowInProduction) return next()

    await next()

    const start = Date.now()
    const req = event.req
    const status = event.res.status || 200
    const duration = Date.now() - start

    Logger.log([
        [`[${req.method}]`, colors[req.method] || 'green'],
        [req.url, 'cyan'],
        [status.toString(), status >= 500 ? 'red' : status >= 400 ? 'yellow' : 'green'],
        [`- ${duration}ms`, 'dim']
    ], ' ')
}
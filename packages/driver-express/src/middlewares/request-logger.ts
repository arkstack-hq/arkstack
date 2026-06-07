import { Logger, nodeEnv } from '@arkstack/common'
import { NextFunction, Request, Response } from 'express'

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
 * @returns 
 */
export const requestLogger = ({
    allowInProduction = false,
}: {
    allowInProduction?: boolean
} = {}) => async (req: Request, res: Response, next: NextFunction) => {
    const VERBOSE = process.env.VERBOSITY != '0'
    if ((nodeEnv() === 'prod' && !allowInProduction) || !VERBOSE) return next()

    const start = Date.now()

    const status = res.statusCode || 200
    const duration = Date.now() - start
    Logger.log([
        [`[${req.method}]`, colors[req.method] || 'white'],
        [req.url, 'cyan'],
        [status.toString(), status >= 500 ? 'red' : status >= 400 ? 'yellow' : 'green'],
        [`- ${duration}ms`, 'dim']
    ], ' ')

    next()
}

export class RequestLoggerMiddleware {
    constructor(private options: { allowInProduction?: boolean } = {}) { }

    handler (req: Request, res: Response, next: NextFunction) {
        const inst = requestLogger(this.options)

        return inst.call(inst, req, res, next)
    }
}
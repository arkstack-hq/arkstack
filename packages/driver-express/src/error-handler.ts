import {
    buildHtmlErrorResponse,
    ErrorHandler,
} from '@arkstack/common'

import type { ErrorRequestHandler } from 'express'

export const defaultErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
    const responseBody = ErrorHandler.createErrorPayload(err)

    if (ErrorHandler.shouldLogError(err)) {
        ErrorHandler.logUnhandledError(err, {
            headers: req.headers,
            method: req.method,
            url: req.originalUrl || req.url,
        }, 'Unhandled Express request error')
    }

    if (process.env.NODE_ENV === 'development') console.error(responseBody)

    if (res.headersSent) {
        next(err)

        return
    }

    const acceptsHeader = Array.isArray(req.headers.accept) ? req.headers.accept.join(',') : req.headers.accept ?? ''
    const expectsJson = acceptsHeader.includes('application/json') || req.originalUrl.startsWith('/api/')
    const code = ErrorHandler.normalizeStatusCode(responseBody.code)

    if (expectsJson) {
        res.status(code).json(responseBody)

        return
    }

    res.status(code).setHeader('Content-Type', 'text/html').send(buildHtmlErrorResponse({
        message: String(responseBody.message),
        stack: typeof responseBody.stack === 'string' ? responseBody.stack : undefined,
        code,
    }))
}

export default defaultErrorHandler

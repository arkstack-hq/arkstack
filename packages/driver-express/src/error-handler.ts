import {
    buildHtmlErrorResponse,
    createErrorPayload,
    logUnhandledError,
    normalizeStatusCode,
    shouldLogError,
} from '@arkstack/common'

import type { ErrorRequestHandler } from 'express'

export const defaultErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
    const responseBody = createErrorPayload(err)

    if (shouldLogError(err)) {
        logUnhandledError(err, {
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
    const code = normalizeStatusCode(responseBody.code)

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
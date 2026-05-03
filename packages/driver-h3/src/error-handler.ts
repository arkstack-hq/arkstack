import { H3Event, HTTPError, HTTPResponse } from 'h3'
import {
    buildHtmlErrorResponse,
    ErrorHandler,
} from '@arkstack/common'

export const defaultErrorHandler = (err: HTTPError | Error | string, event: H3Event) => {
    const responseBody = ErrorHandler.createErrorPayload(err)

    if (ErrorHandler.shouldLogError(err)) {
        ErrorHandler.logUnhandledError(err, {
            headers: Object.fromEntries(event.req.headers.entries()),
            method: event.req.method,
            url: event.req.url,
        }, 'Unhandled H3 request error')
    }

    if (process.env.NODE_ENV === 'development') console.error(responseBody)

    const code = ErrorHandler.normalizeStatusCode(responseBody.code)
    event.res.status = code

    const acceptsHeader = event.req.headers.get('accept') ?? ''
    const expectsJson = acceptsHeader.includes('application/json') || event.req._url?.pathname?.startsWith('/api')

    if (expectsJson) {
        return {
            ...responseBody,
            error: true,
            message: responseBody.message,
        }
    }

    return new HTTPResponse(buildHtmlErrorResponse({
        message: String(responseBody.message),
        stack: typeof responseBody.stack === 'string' ? responseBody.stack : undefined,
        code,
    }), {
        status: code,
        headers: {
            'Content-Type': 'text/html',
        },
    })
}

export default defaultErrorHandler

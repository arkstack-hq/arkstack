import {
    ErrorHandler,
    renderError,
} from '@arkstack/common'
import { H3Event, HTTPError, HTTPResponse } from 'h3'

const webMiddlewareKey = Symbol.for('arkstack:http:web')

const isRecord = (value: unknown): value is Record<PropertyKey, any> => {
    return typeof value === 'object' && value !== null
}

const isWebRequest = (value: unknown): boolean => {
    if (!isRecord(value)) {
        return false
    }

    return value[webMiddlewareKey] === true
        || value.arkstackWeb === true
        || isWebRequest(value.context)
        || isWebRequest(value.req)
}

const redirectBackTarget = (event: H3Event) => {
    return event.req.headers.get('referer') || event.req.headers.get('referrer') || '/'
}

const flashValidationState = async (err: unknown, event: H3Event, errors?: unknown) => {
    const session = (event as any).httpSession ?? (event as any).session ?? event.context?.httpSession ?? event.context?.session

    if (!session) {
        return
    }

    if (errors) {
        session.addErrors?.(errors)
    } else {
        session.addValidationErrors?.(err)
    }

    await session.save?.()
}

export const defaultErrorHandler = async (err: HTTPError | Error | string, event: H3Event) => {
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

    if (code === 422 && !expectsJson && isWebRequest(event)) {
        await flashValidationState(err, event, responseBody.errors)
        event.res.status = 302

        return new HTTPResponse(null, {
            status: 302,
            headers: {
                Location: redirectBackTarget(event),
            },
        })
    }

    if (expectsJson) {
        return {
            ...responseBody,
            error: true,
            message: responseBody.message,
        }
    }

    return new HTTPResponse(renderError({
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

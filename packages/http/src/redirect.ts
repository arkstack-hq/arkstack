import { Request } from './Request'
import { Response } from './Response'
import { isRecord } from './helpers'

const defaultRedirectStatus = 302

const headerValue = (value: unknown): string | undefined => {
    if (Array.isArray(value)) {
        return typeof value[0] === 'string' ? value[0] : undefined
    }

    return typeof value === 'string' ? value : undefined
}

export const redirectBackTarget = (fallback: string = '/') => {
    const request = globalThis.request?.() as Request | { source: any }

    if (request instanceof Request) {
        return request.header('referer') || request.header('referrer') || fallback
    }

    const source = isRecord(request?.source) ? request.source : undefined
    const headers = isRecord(source?.headers) ? source.headers : undefined

    return headerValue(headers?.referer) || headerValue(headers?.referrer) || fallback
}

export const resolveRedirectTarget = (to: string = 'back', fallback: string = '/') => {
    if (!to || to === 'back' || to === 'source') {
        return redirectBackTarget(fallback)
    }

    return to
}

export const redirect = (to: string = 'back', status: number = defaultRedirectStatus) => {
    const target = resolveRedirectTarget(to)
    const response = globalThis.response?.() ?? new Response()

    response.status(status)
    response.header('Location', target)
    response.body = null

    const source = response.source

    if (isRecord(source) && typeof source.redirect === 'function') {
        source.redirect(status, target)
    }

    return response
}

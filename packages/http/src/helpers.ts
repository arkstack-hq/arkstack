import { HeaderMap, HeaderSource, HeaderValue, RequestSource } from './types/Http'

export const unwrapRequestSource = <TUser> (
    source: RequestSource<TUser>
): RequestSource<TUser> => {
    if (source.headers) {
        return source
    }

    if (source.req) {
        return source.req
    }

    if (source.request) {
        return source.request
    }

    return source
}

export const makeHeaders = (headers?: HeaderSource) => {
    return new Headers(normalizeHeaders(headers))
}

export const normalizeHeaders = (headers?: HeaderSource): HeaderMap => {
    const normalized: HeaderMap = {}

    if (!headers) {
        return normalized
    }

    if (isHeaders(headers)) {
        headers.forEach((value, key) => {
            normalized[key.toLowerCase()] = value
        })

        return normalized
    }

    for (const [key, value] of Object.entries(headers)) {
        const normalizedValue = normalizeHeaderValue(value)

        if (typeof normalizedValue === 'string') {
            normalized[key.toLowerCase()] = normalizedValue
        }
    }

    return normalized
}

export const normalizeHeaderValue = (value: HeaderValue) => {
    if (Array.isArray(value)) {
        return value.join(', ')
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value)
    }

    return value ?? undefined
}

export const isHeaders = (value: unknown): value is Headers => (
    typeof Headers !== 'undefined' && value instanceof Headers
)

export const isRecord = (value: unknown): value is Record<PropertyKey, any> => {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}

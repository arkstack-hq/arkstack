import type { HttpContextLike, cookie_options } from './types'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

import { isRecord } from '../helpers'

export const generateSessionId = () => randomBytes(32).toString('base64url')

export const signValue = (value: string, secret: string) =>
    createHmac('sha256', secret).update(value).digest('base64url')

export const encodeSignedValue = (value: string, secret: string) =>
    `${value}.${signValue(value, secret)}`

export const decodeSignedValue = (
    value: string | undefined,
    secret: string,
) => {
    if (!value) return undefined
    const index = value.lastIndexOf('.')
    if (index < 1) return undefined
    const payload = value.slice(0, index)
    const signature = value.slice(index + 1)
    const expected = signValue(payload, secret)
    const signatureBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)
    if (signatureBuffer.length !== expectedBuffer.length) return undefined

    return timingSafeEqual(signatureBuffer, expectedBuffer) ? payload : undefined
}

export const encodeJson = (value: unknown) =>
    Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')

export const decodeJson = <T = unknown> (
    value: string | undefined,
): T | undefined => {
    if (!value) return undefined
    try {
        return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T
    } catch {
        return undefined
    }
}

export const parseCookies = (
    header?: string | string[] | null,
): Record<string, string> => {
    const source = Array.isArray(header) ? header.join('; ') : header || ''

    return source.split(';').reduce<Record<string, string>>((cookies, part) => {
        const index = part.indexOf('=')
        if (index < 0) return cookies
        const key = part.slice(0, index).trim()
        const value = part.slice(index + 1).trim()
        if (key) cookies[key] = decodeURIComponent(value)

        return cookies
    }, {})
}

export const getCookie = (context: HttpContextLike, name: string) => {
    const ctx = isRecord(context.ctx) ? context.ctx : context
    const request = context.request || ctx.clearRequest || ctx.req || ctx.request
    const headers =
        request?.headers || ctx.headers || ctx.req?.headers || ctx.request?.headers
    const cookie =
        typeof headers?.get === 'function'
            ? headers.get('cookie')
            : headers?.cookie

    return parseCookies(cookie)[name]
}

export const serializeCookie = (
    name: string,
    value: string,
    options: cookie_options = {},
) => {
    const parts = [`${name}=${encodeURIComponent(value)}`]
    if (typeof options.maxAge === 'number')
        parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`)
    if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`)
    parts.push(`Path=${options.path || '/'}`)
    if (options.domain) parts.push(`Domain=${options.domain}`)
    if (options.httpOnly !== false) parts.push('HttpOnly')
    if (options.secure) parts.push('Secure')
    if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)

    return parts.join('; ')
}

const appendHeaderValue = (target: any, name: string, value: string) => {
    if (!target) return false
    if (typeof target.append === 'function') {
        target.append(name, value)

        return true
    }
    if (typeof target.appendHeader === 'function') {
        target.appendHeader(name, value)

        return true
    }
    if (typeof target.setHeader === 'function') {
        const current =
            typeof target.getHeader === 'function'
                ? target.getHeader(name)
                : undefined
        const next = current
            ? [...(Array.isArray(current) ? current : [current]), value]
            : value
        target.setHeader(name, next)

        return true
    }
    if (target.headers && typeof target.headers.append === 'function') {
        target.headers.append(name, value)

        return true
    }
    if (target.headers && typeof target.headers.set === 'function') {
        const current = target.headers.get(name)
        target.headers.set(name, current ? `${current}, ${value}` : value)

        return true
    }

    return false
}

export const setCookie = (
    context: HttpContextLike,
    name: string,
    value: string,
    options: cookie_options = {},
) => {
    const ctx = isRecord(context.ctx) ? context.ctx : context
    const cookie = serializeCookie(name, value, options)
    const response = context.response || ctx.clearResponse
    if (response?.headers && typeof response.headers.append === 'function')
        response.headers.append('set-cookie', cookie)

    const assigned =
        appendHeaderValue(response?.source, 'Set-Cookie', cookie) ||
        appendHeaderValue(ctx.res, 'Set-Cookie', cookie) ||
        appendHeaderValue(ctx.response, 'Set-Cookie', cookie) ||
        appendHeaderValue(ctx.response?.source, 'Set-Cookie', cookie) ||
        appendHeaderValue(ctx.event?.res, 'Set-Cookie', cookie)

    void assigned

    return cookie
}

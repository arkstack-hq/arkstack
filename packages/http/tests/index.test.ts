import { Request, Response, arkstackHttpPlugin, normalizeHeaderValue, normalizeHeaders, unwrapRequestSource } from '../src'
import { CoreRouter } from 'clear-router/core'
import { Container } from 'clear-router/decorators'
import { describe, expect, it, vi } from 'vitest'

describe('HTTP primitives', () => {
    it('normalizes request headers and reads bearer tokens consistently', () => {
        const source = {
            headers: {
                Authorization: 'Bearer jwt-token',
                'X-Forwarded-For': ['127.0.0.1', '10.0.0.1'],
            },
            ip: '127.0.0.1',
            method: 'GET',
            originalUrl: '/api/me',
        }

        const request = Request.from(source)!

        expect(request.header('authorization')).toBe('Bearer jwt-token')
        expect(request.header('x-forwarded-for')).toBe('127.0.0.1, 10.0.0.1')
        expect(request.bearerToken()).toBe('jwt-token')
        expect(request.ip).toBe('127.0.0.1')
        expect(request.url).toBe('/api/me')
    })

    it('mirrors authenticated user changes back to the source request', () => {
        const source: { headers: Record<string, string>; user?: { id: number } } = {
            headers: {},
        }
        const user = { id: 1 }
        const request = Request.from(source)!

        request.setUser(user)

        expect(request.user).toBe(user)
        expect(source.user).toBe(user)
    })

    it('keeps authentication state synchronized with the source request', () => {
        const source: {
            headers: Record<string, string>
            user?: { id: number }
            auth?: object
            authUser?: { id: number }
            authToken?: string
        } = {
            headers: {},
        }
        const user = { id: 1 }
        const auth = {}
        const request = Request.from(source)!

        request.setAuthentication(auth, user, 'test-token')

        expect(request.user).toBe(user)
        expect(request.auth).toBe(auth)
        expect(request.authUser).toBe(user)
        expect(request.authToken).toBe('test-token')
        expect(source.user).toBe(user)
        expect(source.auth).toBe(auth)
        expect(source.authUser).toBe(user)
        expect(source.authToken).toBe('test-token')
    })

    it('binds the Arkstack Request to the current Clear Router request', async () => {
        await CoreRouter.use(arkstackHttpPlugin)

        const request = new Request({ method: 'POST', path: '/bound' })
        const resolved = await Container.resolve(Request, {
            clearRequest: request,
            clearResponse: new Response(),
        })

        expect(resolved).toBe(request)
    })

    it('proxies response helpers to the underlying source when available', () => {
        const source = {
            headers: {},
            json: vi.fn(),
            send: vi.fn(),
            setHeader: vi.fn(),
            status: vi.fn(),
        }
        const response = Response.from<Record<string, string>>(source)!

        response.status(201).header('X-Test', 'yes').json({ ok: 'true' })

        expect(response.statusCode).toBe(201)
        expect(response.getHeaders()['x-test']).toBe('yes')
        expect(response.body).toEqual({ ok: 'true' })
        expect(source.status).toHaveBeenCalledWith(201)
        expect(source.setHeader).toHaveBeenCalledWith('X-Test', 'yes')
        expect(source.json).toHaveBeenCalledWith({ ok: 'true' })
    })

    it('returns existing request and response wrappers unchanged', () => {
        const request = new Request({ method: 'POST' })
        const response = new Response({ statusCode: 202 })

        expect(Request.from(request)).toBe(request)
        expect(Response.from(response as never)).toBe(response)
        expect(Request.from()).toBeUndefined()
        expect(Response.from()).toBeUndefined()
    })

    it('unwraps nested request sources from req and request properties', () => {
        const req = { headers: { authorization: 'Bearer req-token' }, method: 'GET' }
        const request = { headers: { authorization: 'Bearer request-token' }, method: 'POST' }

        expect(unwrapRequestSource({ req })).toBe(req)
        expect(unwrapRequestSource({ request })).toBe(request)
        expect(Request.from({ request })?.bearerToken()).toBe('request-token')
    })

    it('normalizes Headers objects and primitive header values', () => {
        const headers = new Headers()
        headers.set('X-Enabled', 'yes')

        expect(normalizeHeaders(headers)).toEqual({ 'x-enabled': 'yes' })
        expect(normalizeHeaderValue(12)).toBe('12')
        expect(normalizeHeaderValue(false)).toBe('false')
        expect(normalizeHeaderValue(null)).toBeUndefined()
    })

    it('falls back to local response state when source helpers are missing', () => {
        const source = {
            headers: {
                'X-Initial': 'yes',
            },
            statusCode: 204,
        }
        const response = Response.from<{ ok: boolean }>(source)!

        expect(response.statusCode).toBe(204)
        expect(response.getHeaders()['x-initial']).toBe('yes')

        expect(response.status(418).header('X-Test', 'yes').send({ ok: true })).toEqual({ ok: true })
        expect(response.statusCode).toBe(418)
        expect(response.getHeaders()['x-test']).toBe('yes')
        expect(source.statusCode).toBe(418)
        expect(response.json({ ok: false })).toEqual({ ok: false })
    })
})

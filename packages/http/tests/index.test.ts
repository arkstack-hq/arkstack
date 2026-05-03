import { describe, expect, it, vi } from 'vitest'
import { Request, Response } from '../src'

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
        expect(response.headers['x-test']).toBe('yes')
        expect(response.body).toEqual({ ok: 'true' })
        expect(source.status).toHaveBeenCalledWith(201)
        expect(source.setHeader).toHaveBeenCalledWith('X-Test', 'yes')
        expect(source.json).toHaveBeenCalledWith({ ok: 'true' })
    })
})

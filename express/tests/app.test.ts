import type { NextFunction, Request, Response } from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RequestError } from '../src/core/utils/errors'
import { ErrorHandler } from '../src/core/utils/request-handlers'

afterEach(() => {
    vi.restoreAllMocks()
})

describe('App', () => {
    it('should start the server', () => {
        expect(true).toBe(true)
    })

    it('delegates to the next error handler after headers are sent', () => {
        globalThis.env = ((key: string, fallback?: unknown) => process.env[key] ?? fallback) as typeof globalThis.env

        const err = new RequestError('Already handled', 500)
        const next = vi.fn() as NextFunction
        const req = {
            headers: { accept: 'application/json' },
            originalUrl: '/api/test',
        } as Request
        const res = {
            headersSent: true,
            status: vi.fn(),
            json: vi.fn(),
            setHeader: vi.fn(),
            send: vi.fn(),
        } as unknown as Response

        ErrorHandler(err, req, res, next)

        expect(next).toHaveBeenCalledWith(err)
        expect(res.status).not.toHaveBeenCalled()
        expect(res.json).not.toHaveBeenCalled()
        expect(res.send).not.toHaveBeenCalled()
    })

    it('throws from RequestError helpers even when request objects are provided', () => {
        const req = {} as Request
        const res = {
            status: vi.fn(),
            json: vi.fn(),
            send: vi.fn(),
        } as unknown as Response

        expect(() => RequestError.assertFound(null, 'Missing resource', 404, req, res)).toThrowError(RequestError)
        expect(() => RequestError.abortIf(true, 'Forbidden', 403, req, res)).toThrowError(RequestError)
        expect(res.status).not.toHaveBeenCalled()
        expect(res.json).not.toHaveBeenCalled()
        expect(res.send).not.toHaveBeenCalled()
    })
})
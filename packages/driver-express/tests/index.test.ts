import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import express, { type Express } from 'express'

import { ExpressDriver, defaultErrorHandler } from '../src/index'

describe('ExpressDriver', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('uses a custom mountPublicAssets override when provided', async () => {
        const app = { use: vi.fn() } as unknown as Express
        const mountPublicAssets = vi.fn().mockResolvedValue(undefined)
        const staticSpy = vi.spyOn(express, 'static')
        const driver = new ExpressDriver({
            bindRouter: vi.fn(),
            mountPublicAssets,
        })

        await driver.mountPublicAssets(app, '/tmp/public')

        expect(mountPublicAssets).toHaveBeenCalledWith(app, '/tmp/public')
        expect(staticSpy).not.toHaveBeenCalled()
        expect(app.use).not.toHaveBeenCalled()
    })

    it('falls back to express.static with cache and cors headers', () => {
        const app = { use: vi.fn() } as unknown as Express
        const staticMiddleware = vi.fn() as ReturnType<typeof express.static>
        const staticSpy = vi.spyOn(express, 'static').mockReturnValue(staticMiddleware)
        const driver = new ExpressDriver({
            bindRouter: vi.fn(),
        })

        driver.mountPublicAssets(app, '/tmp/public')

        expect(staticSpy).toHaveBeenCalledTimes(1)
        expect(staticSpy).toHaveBeenCalledWith('/tmp/public', expect.objectContaining({
            maxAge: '1y',
            immutable: true,
            setHeaders: expect.any(Function),
        }))
        expect(app.use).toHaveBeenCalledWith(staticMiddleware)

        const staticOptions = staticSpy.mock.calls[0][1] as {
            setHeaders: (res: { setHeader: (name: string, value: string) => void }) => void;
        }
        const headers = new Map<string, string>()

        staticOptions.setHeaders({
            setHeader: (name, value) => {
                headers.set(name, value)
            },
        })

        expect(headers.get('Access-Control-Allow-Origin')).toBe('*')
        expect(headers.get('Access-Control-Allow-Methods')).toBe('GET, HEAD, OPTIONS')
        expect(headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization')
    })

    it('registers the built-in error handler when no override is provided', () => {
        const app = { use: vi.fn() } as unknown as Express
        const driver = new ExpressDriver({
            bindRouter: vi.fn(),
        })

        driver.registerErrorHandler(app)

        expect(app.use).toHaveBeenCalledWith(defaultErrorHandler)
    })

    it('registers a custom error handler override when provided', () => {
        const app = { use: vi.fn() } as unknown as Express
        const customHandler = vi.fn() as unknown as ErrorRequestHandler
        const driver = new ExpressDriver({
            bindRouter: vi.fn(),
            errorHandler: customHandler,
        })

        driver.registerErrorHandler(app)

        expect(app.use).toHaveBeenCalledWith(customHandler)
    })

    it('delegates to next when headers were already sent', async () => {
        const err = new Error('Already handled')
        const next = vi.fn() as NextFunction
        const req = {
            headers: { accept: 'application/json' },
            method: 'GET',
            originalUrl: '/api/test',
            url: '/api/test',
        } as Request
        const res = {
            headersSent: true,
            status: vi.fn(),
            json: vi.fn(),
            setHeader: vi.fn(),
            send: vi.fn(),
        } as unknown as Response

        await defaultErrorHandler(err, req, res, next)

        expect(next).toHaveBeenCalledWith(err)
        expect(res.status).not.toHaveBeenCalled()
        expect(res.json).not.toHaveBeenCalled()
    })
})
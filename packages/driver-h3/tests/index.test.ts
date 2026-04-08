import { H3Driver, defaultErrorHandler } from '../src/index'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { H3 } from 'h3'

describe('H3Driver', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('uses a custom mountPublicAssets override when provided', async () => {
        const app = { use: vi.fn() } as unknown as H3
        const mountPublicAssets = vi.fn()
        const driver = new H3Driver({
            bindRouter: vi.fn(),
            mountPublicAssets,
        })

        await driver.mountPublicAssets(app, 'public')

        expect(mountPublicAssets).toHaveBeenCalledWith(app, 'public')
        expect(app.use).not.toHaveBeenCalled()
    })

    it('registers the built-in static asset handler by default', () => {
        const app = { use: vi.fn() } as unknown as H3
        const driver = new H3Driver({
            bindRouter: vi.fn(),
        })

        driver.mountPublicAssets(app, 'public')

        expect(app.use).toHaveBeenCalledTimes(1)
        expect(app.use).toHaveBeenCalledWith(expect.any(Function))
    })

    it('returns a structured JSON payload for API requests', () => {
        const response = defaultErrorHandler(new Error('Boom'), {
            req: {
                _url: { pathname: '/api/test' },
                headers: new Headers({ accept: 'application/json' }),
                method: 'GET',
                url: '/api/test',
            },
            res: {
                status: 200,
            },
        } as never)

        expect(response).toEqual(expect.objectContaining({
            code: 500,
            error: true,
            message: 'Boom',
            status: 'error',
        }))
    })

    it('uses a custom onError override when provided', () => {
        const customOnError = vi.fn()
        const driver = new H3Driver({
            bindRouter: vi.fn(),
            onError: customOnError,
        })

        const app = driver.createApp() as unknown as { config?: { onError?: unknown } }

        expect(app.config?.onError).toBe(customOnError)
    })
})
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3 } from 'h3'

import { H3Driver } from '../src/index'

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
})
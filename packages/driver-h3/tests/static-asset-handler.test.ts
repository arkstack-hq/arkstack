import { beforeEach, describe, expect, it, vi } from 'vitest'

import { serveStatic } from 'h3'
import { staticAssetHandler } from '../src/middlewares/static-asset-handler'

vi.mock('h3', async () => {
    const actual = await vi.importActual<typeof import('h3')>('h3')

    return {
        ...actual,
        serveStatic: vi.fn(),
    }
})



describe('staticAssetHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('ignores requests that do not target a static asset', () => {
        const handler = staticAssetHandler('public')
        const event = {
            req: { url: 'http://localhost/posts' },
            res: { headers: new Headers() },
        }

        const result = handler(event as never)

        expect(result).toBeUndefined()
        expect(serveStatic).not.toHaveBeenCalled()
    })

    it('blocks dotfile and traversal requests', () => {
        const handler = staticAssetHandler('public')

        handler({
            req: { url: 'http://localhost/.env' },
            res: { headers: new Headers() },
        } as never)

        handler({
            req: { url: 'http://localhost/..%2Fsecret.txt' },
            res: { headers: new Headers() },
        } as never)

        expect(serveStatic).not.toHaveBeenCalled()
    })

    it('serves asset requests and applies cache and cors headers', () => {
        const handler = staticAssetHandler('public')
        const event = {
            req: { url: 'http://localhost/app.js' },
            res: { headers: new Headers() },
        }

        vi.mocked(serveStatic).mockReturnValue('served' as never)

        const result = handler(event as never)

        expect(result).toBe('served')
        expect(event.res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
        expect(event.res.headers.get('Access-Control-Allow-Origin')).toBe('*')
        expect(event.res.headers.get('Access-Control-Allow-Methods')).toBe('GET, HEAD, OPTIONS')
        expect(event.res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization')
        expect(serveStatic).toHaveBeenCalledTimes(1)
        expect(serveStatic).toHaveBeenCalledWith(event, expect.objectContaining({
            indexNames: ['/index.html'],
            getContents: expect.any(Function),
            getMeta: expect.any(Function),
        }))
    })
})
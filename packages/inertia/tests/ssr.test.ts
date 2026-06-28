import { afterEach, describe, expect, test, vi } from 'vitest'

import type { InertiaConfig, InertiaPage } from '../src/types'
import { renderRootHtml } from '../src/html'
import { renderViaSsr } from '../src/ssr'

const page: InertiaPage = { component: 'Home', props: { a: 1 }, url: '/', version: '' }

const ssrConfig = (overrides: Partial<InertiaConfig['ssr']> = {}): InertiaConfig => ({
    root_view: 'app',
    root_id: 'app',
    version: null,
    ssr: { enabled: true, url: 'http://127.0.0.1:13714/render', ...overrides },
})

const mockFetch = (impl: () => unknown) => {
    vi.stubGlobal('fetch', vi.fn(async () => impl()))
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('renderViaSsr', () => {
    test('returns the parsed head and body', async () => {
        mockFetch(() => ({
            ok: true,
            json: async () => ({ head: ['<title>Home</title>'], body: '<div id="app">SSR</div>' }),
        }))

        const result = await renderViaSsr(page)

        expect(result).toEqual({ head: ['<title>Home</title>'], body: '<div id="app">SSR</div>' })
    })

    test('returns null on a non-2xx response', async () => {
        mockFetch(() => ({ ok: false, json: async () => ({}) }))

        expect(await renderViaSsr(page)).toBeNull()
    })

    test('returns null on a malformed payload', async () => {
        mockFetch(() => ({ ok: true, json: async () => ({ head: ['x'] }) }))

        expect(await renderViaSsr(page)).toBeNull()
    })

    test('returns null when the SSR server is unreachable', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new Error('ECONNREFUSED')
        }))

        expect(await renderViaSsr(page)).toBeNull()
    })

    test('defaults head to an empty array when omitted', async () => {
        mockFetch(() => ({ ok: true, json: async () => ({ body: '<div id="app">x</div>' }) }))

        expect(await renderViaSsr(page)).toEqual({ head: [], body: '<div id="app">x</div>' })
    })
})

describe('renderRootHtml with SSR', () => {
    test('embeds the SSR markup and head when enabled', async () => {
        mockFetch(() => ({
            ok: true,
            json: async () => ({
                head: ['<title>Home</title>', '<meta name="description" content="x">'],
                body: '<div id="app" data-page="{}">SSR CONTENT</div>',
            }),
        }))

        const html = await renderRootHtml(page, ssrConfig())

        expect(html).toContain('SSR CONTENT')
        expect(html).toContain('<title>Home</title>')
        expect(html).toContain('<meta name="description" content="x">')
    })

    test('falls back to a client mount element when SSR fails', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new Error('down')
        }))

        const html = await renderRootHtml(page, ssrConfig())

        expect(html).toContain('<script data-page="app" type="application/json">')
        expect(html).toContain('<div id="app"></div>')
        expect(html).not.toContain('SSR CONTENT')
    })

    test('does not call the SSR server when disabled', async () => {
        const fetchSpy = vi.fn(async () => ({ ok: true, json: async () => ({ body: 'x' }) }))
        vi.stubGlobal('fetch', fetchSpy)

        const html = await renderRootHtml(page, ssrConfig({ enabled: false }))

        expect(fetchSpy).not.toHaveBeenCalled()
        expect(html).toContain('<script data-page="app" type="application/json">')
        expect(html).toContain('<div id="app"></div>')
    })
})

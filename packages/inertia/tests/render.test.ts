import { afterEach, describe, expect, test } from 'vitest'

import { Inertia } from '../src/Inertia'
import type { InertiaPage, InertiaRequest } from '../src/types'
import { Response } from '@arkstack/http'
import { flushShared, runInertia, setVersion } from '../src'

const makeRequest = (overrides: Partial<InertiaRequest> & { headers?: Record<string, string> } = {}): InertiaRequest => {
    const headers = overrides.headers ?? {}

    return {
        method: overrides.method ?? 'GET',
        url: overrides.url ?? '/users',
        header: overrides.header ?? ((name: string) => headers[name.toLowerCase()]),
    }
}

const inertiaHeaders = (extra: Record<string, string> = {}) => ({ 'x-inertia': 'true', ...extra })

afterEach(() => {
    flushShared()
    setVersion(null)
})

describe('Inertia.render', () => {
    test('returns a JSON page object Response for an Inertia visit', async () => {
        const request = makeRequest({ headers: inertiaHeaders(), url: '/users?page=2' })

        const response = await runInertia(request, () => Inertia.render('Users/Index', { count: 3 }))

        expect(response).toBeInstanceOf(Response)
        expect(response.statusCode).toBe(200)
        expect(response.headers.get('x-inertia')).toBe('true')
        expect(response.headers.get('vary')).toBe('X-Inertia')
        expect(response.headers.get('content-type')).toContain('application/json')

        const page = response.body as InertiaPage
        expect(page.component).toBe('Users/Index')
        // `appName` is shared on every page from `config('app.name')`.
        expect(page.props).toEqual({ appName: 'Arcstack', count: 3 })
        expect(page.url).toBe('/users?page=2')
        expect(page.version).toBe('')
    })

    test('returns an HTML document embedding the page for a first visit', async () => {
        const request = makeRequest({ url: '/users' })

        const response = await runInertia(request, () => Inertia.render('Users/Index', { count: 1 }))

        const html = response.body as string
        expect(response.headers.get('content-type')).toContain('text/html')
        expect(response.headers.get('x-inertia')).toBeNull()
        expect(html).toContain('<script data-page="app" type="application/json">')
        expect(html).toContain('<div id="app"></div>')
        // The embedded page JSON lives in the script element, with `/` escaped to `\/`.
        expect(html).toContain('"component":"Users\\/Index"')
        expect(html).toContain('"count":1')
    })

    test('evaluates function and promise props', async () => {
        const request = makeRequest({ headers: inertiaHeaders() })

        const response = await runInertia(request, () => Inertia.render('Dash', {
            sync: () => 'a',
            async: async () => 'b',
            nested: { deep: () => 'c' },
        }))

        expect((response.body as InertiaPage).props).toEqual({
            appName: 'Arcstack',
            sync: 'a',
            async: 'b',
            nested: { deep: 'c' },
        })
    })

    test('merges shared props beneath page props', async () => {
        const request = makeRequest({ headers: inertiaHeaders() })

        const response = await runInertia(request, () => {
            Inertia.share('appName', 'Arkstack')
            Inertia.share({ flash: 'hi' })

            return Inertia.render('Home', { flash: 'override' })
        })

        expect((response.body as InertiaPage).props).toEqual({
            appName: 'Arkstack',
            flash: 'override',
        })
    })

    test('throws when called outside a request context', async () => {
        await expect(Inertia.render('Home')).rejects.toThrow(/outside of a request/)
    })
})

describe('asset versioning', () => {
    test('responds 409 with X-Inertia-Location on a version mismatch GET', async () => {
        setVersion('v2')
        const request = makeRequest({
            url: '/users',
            headers: inertiaHeaders({ 'x-inertia-version': 'v1' }),
        })

        const response = await runInertia(request, () => Inertia.render('Users/Index'))

        expect(response.statusCode).toBe(409)
        expect(response.headers.get('x-inertia-location')).toBe('/users')
    })

    test('renders normally when versions match', async () => {
        setVersion('v2')
        const request = makeRequest({ headers: inertiaHeaders({ 'x-inertia-version': 'v2' }) })

        const response = await runInertia(request, () => Inertia.render('Users/Index'))

        expect(response.statusCode).toBe(200)
        expect((response.body as InertiaPage).version).toBe('v2')
    })

    test('supports a function version resolver', async () => {
        setVersion(() => 'hash-123')
        const request = makeRequest({ headers: inertiaHeaders({ 'x-inertia-version': 'hash-123' }) })

        const response = await runInertia(request, () => Inertia.render('Home'))

        expect(response.statusCode).toBe(200)
        expect((response.body as InertiaPage).version).toBe('hash-123')
    })
})

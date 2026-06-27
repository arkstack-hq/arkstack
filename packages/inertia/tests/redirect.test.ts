import { describe, expect, test } from 'vitest'

import { Inertia } from '../src/Inertia'
import type { InertiaRequest } from '../src/types'
import { runInertia, shouldUpgradeRedirect } from '../src'

const request = (method: string, headers: Record<string, string> = {}): InertiaRequest => ({
    method,
    url: '/users',
    header: (name: string) => headers[name.toLowerCase()],
})

describe('Inertia.redirect', () => {
    test('uses 302 for GET/POST', async () => {
        const get = runInertia(request('GET'), () => Inertia.redirect('/home'))
        const post = runInertia(request('POST'), () => Inertia.redirect('/home'))

        expect(get.statusCode).toBe(302)
        expect(post.statusCode).toBe(302)
        expect(get.headers.get('location')).toBe('/home')
    })

    test('upgrades to 303 for PUT/PATCH/DELETE', () => {
        for (const method of ['PUT', 'PATCH', 'DELETE']) {
            const response = runInertia(request(method), () => Inertia.redirect('/home'))
            expect(response.statusCode).toBe(303)
        }
    })

    test('respects an explicit status', () => {
        const response = runInertia(request('PUT'), () => Inertia.redirect('/home', 307))
        expect(response.statusCode).toBe(307)
    })

    test('back() redirects to the referer', () => {
        const response = runInertia(
            request('POST', { referer: '/previous' }),
            () => Inertia.back(),
        )
        expect(response.headers.get('location')).toBe('/previous')
    })

    test('back() falls back when no referer is present', () => {
        const response = runInertia(request('POST'), () => Inertia.back('/fallback'))
        expect(response.headers.get('location')).toBe('/fallback')
    })
})

describe('Inertia.location', () => {
    test('responds 409 with X-Inertia-Location on an Inertia visit', () => {
        const response = runInertia(
            request('GET', { 'x-inertia': 'true' }),
            () => Inertia.location('https://example.com'),
        )
        expect(response.statusCode).toBe(409)
        expect(response.headers.get('x-inertia-location')).toBe('https://example.com')
    })

    test('responds 302 on a non-Inertia visit', () => {
        const response = runInertia(request('GET'), () => Inertia.location('https://example.com'))
        expect(response.statusCode).toBe(302)
        expect(response.headers.get('location')).toBe('https://example.com')
    })
})

describe('shouldUpgradeRedirect', () => {
    test('only upgrades 302 for mutation methods', () => {
        expect(shouldUpgradeRedirect('PUT', 302)).toBe(true)
        expect(shouldUpgradeRedirect('delete', 302)).toBe(true)
        expect(shouldUpgradeRedirect('GET', 302)).toBe(false)
        expect(shouldUpgradeRedirect('PUT', 301)).toBe(false)
    })
})

import { afterEach, describe, expect, it } from 'vitest'

import { Inertia } from '../src/Inertia'
import { Router as ClearRouter } from 'clear-router/express'
import { flushShared, setVersion } from '../src'
import { inertia } from '../../driver-express/src/middlewares/inertia'
import express from 'express'
import request from 'parasito'

/**
 * Boots a real Express server with the `inertia()` middleware and clear-router
 * routes that return `Inertia.render(...)` Responses. This exercises the full
 * path — middleware context binding, the adapter, and clear-router serializing a
 * returned `@arkstack/http` Response — over real HTTP, validating that no driver
 * send-path changes are needed.
 */
const createApp = (name: string) => {
    const Router = class extends ClearRouter {
        protected static routerStateNamespace = `inertia-integration:${name}`
    }

    Router.get('/', () => Inertia.render('Home', {
        greeting: 'hi',
        heavy: Inertia.lazy(() => 'H'),
    }))

    Router.get('/users', () => Inertia.render('Users/Index', {
        users: ['ada'],
        stats: () => 42,
    }))

    Router.get('/shared', () => {
        Inertia.share('appName', 'Arkstack')

        return Inertia.render('Shared', {})
    })

    const router = express.Router()
    Router.apply(router)

    const app = express()
    app.use(inertia())
    app.use(router)

    return app
}

afterEach(() => {
    flushShared()
    setVersion(null)
})

describe('Express end-to-end Inertia protocol', () => {
    it('serves an HTML document with the embedded page on a first visit', async () => {
        const response = await request(createApp('first')).get('/').set('accept', 'text/html')

        expect(response.status).toBe(200)
        expect(response.header['content-type']).toContain('text/html')
        expect(response.text).toContain('<script data-page="app" type="application/json">')
        expect(response.text).toContain('"component":"Home"')
        // lazy prop excluded from the initial load
        expect(response.text).not.toContain('heavy')
    })

    it('returns a JSON page object on an Inertia visit', async () => {
        const response = await request(createApp('xhr')).get('/').set('x-inertia', 'true')

        expect(response.status).toBe(200)
        expect(response.header['x-inertia']).toBe('true')
        expect(response.header['vary']).toContain('X-Inertia')
        expect(response.header['content-type']).toContain('application/json')
        expect(response.body).toMatchObject({
            component: 'Home',
            props: { greeting: 'hi' },
            url: '/',
            version: '',
        })
        expect(response.body.props.heavy).toBeUndefined()
    })

    it('responds 409 with X-Inertia-Location on an asset-version mismatch', async () => {
        const response = await request(createApp('version'))
            .get('/')
            .set('x-inertia', 'true')
            .set('x-inertia-version', 'stale')

        expect(response.status).toBe(409)
        expect(response.header['x-inertia-location']).toBe('/')
    })

    it('filters props on a matching partial reload', async () => {
        const response = await request(createApp('partial'))
            .get('/users')
            .set('x-inertia', 'true')
            .set('x-inertia-partial-component', 'Users/Index')
            .set('x-inertia-partial-data', 'stats')

        expect(response.status).toBe(200)
        expect(response.body.props).toEqual({ stats: 42 })
    })

    it('includes shared props in the page object', async () => {
        const response = await request(createApp('shared')).get('/shared').set('x-inertia', 'true')

        expect(response.body.props).toEqual({ appName: 'Arkstack' })
    })
})

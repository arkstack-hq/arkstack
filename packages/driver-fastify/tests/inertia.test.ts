import { Inertia, flushShared, setVersion } from '@arkstack/inertia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { FastifyInstance } from 'fastify'
import { FastifyDriver, Router } from '../src/index'
import { inertia } from '../src/middlewares/inertia'

describe('Fastify Inertia middleware', () => {
  let app: FastifyInstance

  beforeEach(() => {
    Router.reset()
  })

  afterEach(async () => {
    await app?.close()
    flushShared()
    setVersion(null)
  })

  const boot = async (routes: () => void) => {
    const driver = new FastifyDriver({ bindRouter: (instance) => void Router.apply(instance) })

    app = driver.createApp()
    routes()
    await driver.bindRouter(app)
    driver.applyMiddleware(app, { global: [], before: [inertia()], after: [] })
    await app.ready()
  }

  it('serves an HTML document with the page on a first visit', async () => {
    await boot(() => {
      Router.get('/', () => Inertia.render('Home', { greeting: 'hi', heavy: Inertia.lazy(() => 'H') }))
    })

    const res = await app.inject().get('/').headers({ accept: 'text/html' })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.body).toContain('"component":"Home"')
    expect(res.body).not.toContain('heavy')
  })

  it('returns the page object on an Inertia visit', async () => {
    await boot(() => {
      Router.get('/users', () => Inertia.render('Users/Index', { users: ['ada'], stats: () => 42 }))
    })

    const res = await app.inject().get('/users?page=2').headers({ 'x-inertia': 'true' })

    expect(res.headers['x-inertia']).toBe('true')
    expect(res.json()).toMatchObject({
      component: 'Users/Index',
      props: { users: ['ada'], stats: 42 },
      url: '/users?page=2',
    })
  })

  it('filters props on a partial reload', async () => {
    await boot(() => {
      Router.get('/users', () => Inertia.render('Users/Index', { users: ['ada'], stats: () => 42 }))
    })

    const res = await app.inject().get('/users').headers({
      'x-inertia': 'true',
      'x-inertia-partial-component': 'Users/Index',
      'x-inertia-partial-data': 'stats',
    })

    expect(res.json().props).toEqual({ stats: 42 })
  })

  it('keeps props shared during the request', async () => {
    await boot(() => {
      Router.get('/shared', () => {
        Inertia.share('appName', 'Arkstack')

        return Inertia.render('Shared', {})
      })
    })

    const res = await app.inject().get('/shared').headers({ 'x-inertia': 'true' })

    expect(res.json().props).toEqual({ appName: 'Arkstack' })
  })

  it('answers an asset version mismatch with 409', async () => {
    setVersion('v2')

    await boot(() => {
      Router.get('/', () => Inertia.render('Home', {}))
    })

    const res = await app.inject().get('/').headers({ 'x-inertia': 'true', 'x-inertia-version': 'v1' })

    expect(res.statusCode).toBe(409)
    expect(res.headers['x-inertia-location']).toBe('/')
  })

  it('upgrades redirects after an Inertia PUT, PATCH or DELETE to 303', async () => {
    await boot(() => {
      Router.put('/users/1', (({ reply }: { reply: { redirect: (url: string) => unknown } }) =>
        reply.redirect('/users')) as never)
    })

    const inertiaVisit = await app.inject().put('/users/1').headers({ 'x-inertia': 'true' })
    const plainVisit = await app.inject().put('/users/1')

    expect(inertiaVisit.statusCode).toBe(303)
    expect(inertiaVisit.headers.location).toBe('/users')
    expect(plainVisit.statusCode).toBe(302)
  })
})

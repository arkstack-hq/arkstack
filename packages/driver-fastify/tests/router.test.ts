import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FastifyDriver, Router } from '../src/index'
import { Arkstack } from '@arkstack/contract'
import { Logger } from '@arkstack/common'
import path from 'node:path'
import { Resource } from 'resora'

describe('Fastify Router', () => {
  let app: FastifyInstance
  let warnings: string[]

  beforeEach(() => {
    warnings = []
    Router.reset()
  })

  afterEach(async () => {
    await app?.close()
    vi.restoreAllMocks()
  })

  const boot = async (routes: () => void, before: Array<(req: FastifyRequest) => unknown> = []) => {
    const driver = new FastifyDriver({
      bindRouter: (instance) => void Router.apply(instance),
      createApp: () => Fastify({ logger: { level: 'warn', stream: { write: (line: string) => warnings.push(line) } } }),
    })

    app = driver.createApp()
    routes()
    await driver.bindRouter(app)
    driver.applyMiddleware(app, { global: [], before, after: [] })
    driver.registerErrorHandler(app)
    await app.ready()
  }

  it('dispatches resora resources returned from routes once', async () => {
    await boot(() => {
      Router.get('/users/1', () => new Resource({ id: 1, name: 'Ada' }))
    })

    const res = await app.inject().get('/users/1')

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ data: { id: 1, name: 'Ada' } })
    expect(warnings.join('')).not.toContain('FST_ERR_REP_ALREADY_SENT')
  })

  it('runs app middleware for routes applied before it', async () => {
    const before = vi.fn()

    await boot(() => {
      Router.get('/ping', () => ({ ok: true }))
    }, [before])

    const res = await app.inject().get('/ping')

    expect(res.json()).toEqual({ ok: true })
    expect(before).toHaveBeenCalledOnce()
  })

  it('lists the registered routes', async () => {
    Router.get('/listed', () => ({ ok: true }))

    const routes = Router.allRoutes()

    expect(routes.map((route) => route.path)).toContain('/listed')
  })
  it('binds the api and web route files and answers unmatched requests with a 404', async () => {
    vi.spyOn(Arkstack, 'rootDir').mockReturnValue(path.join(__dirname, 'fixtures/app'))

    app = new FastifyDriver({ bindRouter: (instance) => void Router.bind(instance) }).createApp()
    await Router.bind(app)
    await app.ready()

    const api = await app.inject().get('/api/status')
    const web = await app.inject().get('/welcome')
    const missing = await app.inject().get('/api/missing')

    expect(api.json()).toEqual({ status: 'OK' })
    expect(web.body).toBe('Welcome')
    expect(missing.statusCode).toBe(404)
    expect(missing.json().message).toBe('Cannot find any route matching [GET] /api/missing')
  })

  it('logs route files that cannot be loaded', async () => {
    vi.spyOn(Arkstack, 'rootDir').mockReturnValue(path.join(__dirname, 'fixtures/missing'))

    const error = vi.spyOn(Logger, 'error').mockImplementation(() => undefined as never)
    const routes = await Router.list()

    expect(routes).toEqual([])
    expect(error.mock.calls.map(([message]) => message)).toEqual([
      expect.stringContaining('Unable to load "api.ts" routes'),
      expect.stringContaining('Unable to load "web.ts" routes'),
    ])
  })
})

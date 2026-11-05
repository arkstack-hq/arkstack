import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { AsyncLocalStorage } from 'node:async_hooks'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'

import { FastifyDriver } from '../src/index'
import { RequestException } from '@arkstack/common'
import { formdata } from '../src/middlewares'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const makeApp = (driver = new FastifyDriver({ bindRouter: vi.fn() })) => {
  const app = driver.createApp()

  driver.registerErrorHandler(app)

  return { app, driver }
}

describe('FastifyDriver', () => {
  let app: FastifyInstance

  afterEach(async () => {
    await app?.close()
  })

  it('parses urlencoded bodies out of the box', async () => {
    ;({ app } = makeApp())
    app.post('/form', async (req) => req.body)

    const res = await app.inject({
      method: 'POST',
      url: '/form',
      payload: 'name=Ada&role=admin',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    })

    expect(res.json()).toEqual({ name: 'Ada', role: 'admin' })
  })

  it('registers plugins from the driver options', async () => {
    const plugin = vi.fn(async () => {})

    ;({ app } = makeApp(new FastifyDriver({ bindRouter: vi.fn(), plugins: [[plugin, { a: 1 }]] })))
    await app.ready()

    expect(plugin.mock.calls[0][1]).toMatchObject({ a: 1 })
  })

  it('runs global, before and after middleware at their lifecycle points', async () => {
    const seen: string[] = []
    let finished!: () => void
    const done = new Promise<void>((resolve) => (finished = resolve))

    ;({ app } = makeApp())
    new FastifyDriver({ bindRouter: vi.fn() }).applyMiddleware(app, {
      global: [async (req: FastifyRequest) => void seen.push(`global:${req.body === undefined}`)],
      before: [
        (req: FastifyRequest, _reply: FastifyReply, done: (error?: Error) => void) => {
          seen.push(`before:${JSON.stringify(req.body)}`)
          done()
        },
      ],
      after: [
        async (_req: FastifyRequest, reply: FastifyReply) => {
          seen.push(`after:${reply.statusCode}`)
          finished()
        },
      ],
    })
    app.post('/thing', async () => {
      seen.push('handler')

      return { ok: true }
    })

    const res = await app.inject({ method: 'POST', url: '/thing', payload: { a: 1 } })
    await done

    expect(res.statusCode).toBe(200)
    expect(seen).toEqual(['global:true', 'before:{"a":1}', 'handler', 'after:200'])
  })

  it('keeps the async context a callback middleware opens around done', async () => {
    const storage = new AsyncLocalStorage<string>()

    ;({ app } = makeApp())
    new FastifyDriver({ bindRouter: vi.fn() }).applyMiddleware(app, {
      global: [],
      before: [
        async (_req: FastifyRequest, _reply: FastifyReply, done: (error?: Error) => void) => {
          await Promise.resolve()
          storage.run('fr', () => done())
        },
      ],
      after: [],
    })
    app.get('/locale', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1))

      return { locale: storage.getStore() }
    })

    const res = await app.inject().get('/locale')

    expect(res.json()).toEqual({ locale: 'fr' })
  })

  it('resolves class middleware through its handle method', async () => {
    class TagMiddleware {
      handle(_req: FastifyRequest, reply: FastifyReply) {
        reply.header('x-tag', 'set')
      }
    }

    ;({ app } = makeApp())
    new FastifyDriver({ bindRouter: vi.fn() }).applyMiddleware(app, {
      global: [],
      before: [TagMiddleware as never],
      after: [],
    })
    app.get('/thing', async () => ({ ok: true }))

    const res = await app.inject().get('/thing')

    expect(res.headers['x-tag']).toBe('set')
  })

  it('logs a failing after middleware instead of failing the request', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    let failed!: () => void
    const done = new Promise<void>((resolve) => (failed = resolve))

    ;({ app } = makeApp())
    new FastifyDriver({ bindRouter: vi.fn() }).applyMiddleware(app, {
      global: [],
      before: [],
      after: [
        async () => {
          setTimeout(failed, 0)
          throw new Error('after blew up')
        },
      ],
    })
    app.get('/thing', async () => ({ ok: true }))

    const res = await app.inject().get('/thing')
    await done

    expect(res.statusCode).toBe(200)
    expect(errors.mock.calls.flat().join(' ')).toContain('after blew up')
    errors.mockRestore()
  })

  it('renders request errors as JSON for api requests and HTML otherwise', async () => {
    vi.stubGlobal('view', () => ({ renderSync: () => '<h1>Not Found</h1>' }))
    ;({ app } = makeApp())
    app.get('/api/missing', async () => {
      throw new RequestException('Profile not found', 404)
    })
    app.get('/missing', async () => {
      throw new RequestException('Profile not found', 404)
    })

    const api = await app.inject().get('/api/missing')
    const web = await app.inject().get('/missing')

    expect(api.statusCode).toBe(404)
    expect(api.json()).toMatchObject({ status: 'error', message: 'Profile not found', code: 404 })
    expect(web.statusCode).toBe(404)
    expect(web.headers['content-type']).toContain('text/html')
    expect(web.body).toBe('<h1>Not Found</h1>')
    vi.unstubAllGlobals()
  })

  it('handles errors of routes added after an awaited setup step', async () => {
    const app = new FastifyDriver({ bindRouter: vi.fn() }).createApp()

    await new Promise((resolve) => setTimeout(resolve, 5))
    app.get('/api/late', async () => {
      throw new RequestException('Late failure', 409)
    })

    const res = await app.inject().get('/api/late')

    expect(res.json()).toMatchObject({ status: 'error', message: 'Late failure', code: 409 })
    await app.close()
  })

  it('uses a custom error handler when provided', async () => {
    const errorHandler = vi.fn((_err: Error, _req: FastifyRequest, reply: FastifyReply) =>
      reply.code(418).send('teapot'),
    )

    ;({ app } = makeApp(new FastifyDriver({ bindRouter: vi.fn(), errorHandler })))
    app.get('/boom', async () => {
      throw new Error('boom')
    })

    const res = await app.inject().get('/boom')

    expect(res.statusCode).toBe(418)
    expect(errorHandler).toHaveBeenCalledOnce()
  })

  it('serves public assets with cache and cors headers', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'arkstack-fastify-'))
    writeFileSync(join(dir, 'app.css'), 'body{}')

    ;({ app } = makeApp())
    await new FastifyDriver({ bindRouter: vi.fn() }).mountPublicAssets(app, dir)

    const res = await app.inject().get('/app.css')

    expect(res.statusCode).toBe(200)
    expect(res.body).toBe('body{}')
    expect(res.headers['cache-control']).toContain('immutable')
    expect(res.headers['access-control-allow-origin']).toBe('*')
  })

  it('uses a custom mountPublicAssets override when provided', async () => {
    const mountPublicAssets = vi.fn()

    ;({ app } = makeApp())
    await new FastifyDriver({ bindRouter: vi.fn(), mountPublicAssets }).mountPublicAssets(app, '/tmp/public')

    expect(mountPublicAssets.mock.calls[0][0]).toBe(app)
    expect(mountPublicAssets.mock.calls[0][1]).toBe('/tmp/public')
  })
})

describe('formdata middleware', () => {
  let app: FastifyInstance

  beforeEach(() => {
    app = new FastifyDriver({ bindRouter: vi.fn() }).createApp()
    app.addHook('preHandler', formdata())
    app.post('/upload', async (req) => ({
      body: req.body,
      uploads: req.uploads?.map(({ fieldname, originalname, mimetype, size }) => ({
        fieldname,
        originalname,
        mimetype,
        size,
      })),
    }))
  })

  afterEach(async () => {
    await app.close()
  })

  it('reads fields into the body and files into uploads', async () => {
    const boundary = 'arkstack'
    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="name"',
      '',
      'Ada',
      `--${boundary}`,
      'Content-Disposition: form-data; name="avatar"; filename="a.txt"',
      'Content-Type: text/plain',
      '',
      'hello',
      `--${boundary}--`,
      '',
    ].join('\r\n')

    const res = await app.inject({
      method: 'POST',
      url: '/upload',
      payload,
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    })

    expect(res.json()).toEqual({
      body: { name: 'Ada' },
      uploads: [{ fieldname: 'avatar', originalname: 'a.txt', mimetype: 'text/plain', size: 5 }],
    })
  })

  it('leaves non-multipart requests alone', async () => {
    const res = await app.inject({ method: 'POST', url: '/upload', payload: { name: 'Ada' } })

    expect(res.json()).toEqual({ body: { name: 'Ada' } })
  })
})

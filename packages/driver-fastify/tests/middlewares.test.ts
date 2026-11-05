import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify'
import { AuthMiddleware, auth } from '../src/middlewares/auth'
import { RequestLoggerMiddleware, requestLogger } from '../src/middlewares/request-logger'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Logger } from '@arkstack/common'
import { defaultErrorHandler } from '../src/error-handler'
import { getCtx } from 'resora'
import { limiter } from '../src/middlewares/limiter'
import { resora } from '../src/middlewares/resora'

const authorizeToken = vi.fn(async (token: string) => ({ id: 1, token }))

vi.mock('@arkstack/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@arkstack/auth')>()

  return {
    ...actual,
    Auth: {
      make: () => ({
        setRequest() {
          return this
        },
        authorizeToken,
        session: () => ({ id: 'session' }),
      }),
    },
  }
})

const makeApp = () => {
  const app = Fastify()

  app.setErrorHandler(defaultErrorHandler)

  return app
}

describe('Fastify middlewares', () => {
  let app: FastifyInstance

  afterEach(async () => {
    await app?.close()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('rejects requests without a bearer token', async () => {
    app = makeApp()
    app.get('/me', { preHandler: auth }, () => ({ ok: true }))

    const res = await app.inject().get('/me').headers({ accept: 'application/json' })

    expect(res.statusCode).toBe(401)
    expect(authorizeToken).not.toHaveBeenCalled()
  })

  it('attaches the authorized user, auth and session to the request', async () => {
    app = makeApp()
    app.get('/me', { preHandler: (req, reply) => new AuthMiddleware().handle(req, reply) }, (req) => ({
      user: req.user,
      token: req.authToken,
      session: req.session,
    }))

    const res = await app.inject().get('/me').headers({ authorization: 'Bearer secret' })

    expect(res.json()).toEqual({ user: { id: 1, token: 'secret' }, token: 'secret', session: { id: 'session' } })
    expect(authorizeToken).toHaveBeenCalledWith('secret')
  })

  it('limits requests with the rate limiter plugin entry', async () => {
    app = makeApp()

    const [plugin, options] = limiter(1, 60, 'Slow down') as [never, object]

    await app.register(plugin, options)
    app.get('/limited', () => ({ ok: true }))

    const first = await app.inject().get('/limited')
    const second = await app.inject().get('/limited').headers({ accept: 'application/json' })

    expect(first.statusCode).toBe(200)
    expect(second.statusCode).toBe(429)
    expect(second.json().message).toBe('Slow down')
  })

  it('logs finished requests outside of tests', async () => {
    vi.stubEnv('VITEST', '')
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('VERBOSITY', '1')

    const log = vi.spyOn(Logger, 'log').mockReturnValue('')

    app = makeApp()
    app.addHook('onResponse', (req, reply) => new RequestLoggerMiddleware().handle(req, reply))
    app.get('/logged', () => ({ ok: true }))

    await app.inject().get('/logged')

    expect(log).toHaveBeenCalledOnce()
    expect(log.mock.calls[0][0]).toEqual(expect.arrayContaining([['[GET]', 'green'], ['/logged', 'cyan']]))
  })

  it('skips request logging in tests', async () => {
    const log = vi.spyOn(Logger, 'log').mockReturnValue('')

    await requestLogger()({ method: 'GET', url: '/' } as FastifyRequest, { statusCode: 200 } as FastifyReply)

    expect(log).not.toHaveBeenCalled()
  })

  it('binds the request and reply as the resora context', async () => {
    app = makeApp()
    app.addHook('preHandler', resora())
    app.get('/ctx', (req, reply) => {
      const ctx = getCtx() as { req: unknown; res: unknown }

      return { req: ctx.req === req, res: ctx.res === reply }
    })

    const res = await app.inject().get('/ctx')

    expect(res.json()).toEqual({ req: true, res: true })
  })
})

describe('Fastify error handler', () => {
  let app: FastifyInstance

  afterEach(async () => {
    await app?.close()
  })

  const validationError = () =>
    Object.assign(new Error('The given data was invalid.'), {
      statusCode: 422,
      errors: () => ({ email: ['The email field is required.'] }),
    })

  it('redirects failed web validation back and flashes the errors', async () => {
    const session = { addErrors: vi.fn(), addValidationErrors: vi.fn(), save: vi.fn() }

    app = makeApp()
    app.addHook('onRequest', async (req) => {
      Object.assign(req, { arkstackWeb: true, session })
    })
    app.post('/register', () => {
      throw validationError()
    })

    const res = await app.inject().post('/register').headers({ referer: '/register' })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/register')
    expect(session.addErrors).toHaveBeenCalledWith({ email: ['The email field is required.'] })
    expect(session.save).toHaveBeenCalledOnce()
  })

  it('redirects home when a failed web request has no referer', async () => {
    app = makeApp()
    app.addHook('onRequest', async (req) => {
      Object.assign(req, { arkstackWeb: true })
    })
    app.post('/register', () => {
      throw validationError()
    })

    const res = await app.inject().post('/register')

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/')
  })

  it('leaves a reply that was already sent alone', async () => {
    app = makeApp()
    app.get('/sent', async (_req, reply) => {
      await reply.send({ ok: true })

      throw new Error('after send')
    })

    const res = await app.inject().get('/sent')

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
  })
})

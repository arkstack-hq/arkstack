import 'clear-router/decorators/setup'

import { Controller as BaseController, Request } from 'clear-router'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, it } from 'vitest'

import { Bind } from 'clear-router/decorators'
import { Container } from 'clear-router/decorators'
import { Router } from 'clear-router/fastify'
import { request } from 'parasito'

describe('@Bind() — Controllers', () => {
  let app: FastifyInstance

  const setupApp = async (): Promise<void> => {
    Router.apply(app)
    await app.ready()
  }

  beforeEach(() => {
    Router.reset()
    Container.clear()

    app = Fastify()
  })

  afterEach(async () => {
    await app.close()
  })

  class UserController extends BaseController {
    @Bind()
    async test(req: Request) {
      return req.url ?? ''
    }
  }

  it('can setup basic route', async () => {
    Router.get('/test', ({ reply }) => reply.send('OK'))
    await setupApp()
    await request(app).get('/test').expect(200).expect('OK')
  })

  it('can use container injection in controllers', async () => {
    Router.get('/test/:id', [UserController, 'test'])
    await setupApp()
    await request(app).get('/test/1541').expect(200).expect('/test/1541')
  })
})

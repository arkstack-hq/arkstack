import { Bind, Container } from 'clear-router/decorators'
import { beforeEach, describe, it } from 'vitest'
import express, { Router as ExRouter } from 'express'

import { Request as ClearRouterRequest } from 'clear-router/core'
import { Router } from 'clear-router/express'
import request from 'parasito'

describe('Express App (JS)', () => {
    let app: express.Application
    let router: ExRouter

    beforeEach(() => {
        Router.configure({
            container: {
                enabled: false,
                autoDiscover: false,
            },
        })
        Router.reset()
        Container.clear()

        app = express()
        router = ExRouter()
        app.use(express.json())
    })

    const setupApp = async (): Promise<void> => {
        Router.apply(router)
        app.use(router)
    }

    it('GET / should return 200', async () => {
        Router.get('/directly', ({ res }) => res.send('Hello World'))
        await setupApp()
        await request(app).get('/directly').expect(200).expect('Hello World')
    })

    it('uses explicit container bindings when available', async () => {
        class AuditService {
            name = 'fallback'
        }

        class BoundAuditService extends AuditService {
            name = 'bound'
        }

        class BoundUsersController {
            @Bind(ClearRouterRequest, AuditService)
            show (request: ClearRouterRequest, audit: AuditService) {
                return {
                    id: request.param('id'),
                    audit: audit.name,
                }
            }
        }

        Container.bind(AuditService, () => new BoundAuditService())
        Router.configure({
            container: {
                enabled: true,
                autoDiscover: true,
            },
        })
        Router.get('/api/bound/:id', [BoundUsersController, 'show'])

        await setupApp()

        await request(app)
            .get('/api/bound/321')
            .expect(200)
            .expect({ id: '321', audit: 'bound' })
    })

    it('falls back to the default handler signature when binding is disabled', async () => {
        class BoundUsersController {
            @Bind(ClearRouterRequest)
            show (ctx: any, request: ClearRouterRequest) {
                return {
                    hasContext: Boolean(ctx.req),
                    id: request.param('id'),
                }
            }
        }

        Router.configure({
            container: {
                enabled: false,
            },
        })
        Router.get('/api/default/:id', [BoundUsersController, 'show'])

        await setupApp()

        await request(app)
            .get('/api/default/777')
            .expect(200)
            .expect({ hasContext: true, id: '777' })
    })

    it('should always expose req.getBody in handlers', async () => {
        Router.get('/body-check', ({ req, res }) => {
            res.json({
                hasGetBody: typeof req.getBody === 'function',
                body: req.getBody(),
            })
        })

        Router.post('/body-check', ({ req, res }) => {
            res.json({
                hasGetBody: typeof req.getBody === 'function',
                body: req.getBody(),
            })
        })

        await setupApp()

        await request(app)
            .get('/body-check')
            .expect(200)
            .expect({
                hasGetBody: true,
                body: {},
            })

        await request(app).post('/body-check').send({ foo: 'bar' })
            .expect(200)
            .expect({
                hasGetBody: true,
                body: { foo: 'bar' },
            })
    })

    it('supports POST _method override for PUT routes', async () => {
        Router.put('/api/users/:id', ({ req, res }) => {
            res.json({
                method: req.method,
                id: req.params.id,
            })
        })

        await setupApp()

        await request(app)
            .post('/api/users/123')
            .send({ _method: 'PUT' })
            .expect(200)
            .expect({
                method: 'PUT',
                id: '123',
            })
    })

    it('returns 404 for POST to PUT route when _method override is missing', async () => {
        Router.put('/api/users/:id', ({ res }) => res.send('updated'))

        await setupApp()

        await request(app)
            .post('/api/users/123')
            .send({})
            .expect(404)
    })

    it('sends actual data', async () => {
        Router.post('/api/users/:id', ({ req }) => req.getBody())

        await setupApp()

        await request(app)
            .post('/api/users/123')
            .send({ name: 'Jude' })
            .expect(201)
            .expect({ name: 'Jude' })
    })
})

import 'clear-router/decorators/setup'

import { Controller as BaseController, Request } from 'clear-router'
import { beforeEach, describe, it } from 'vitest'
import express, { Router as ExRouter } from 'express'

import { Bind } from 'clear-router/decorators'
import { Container } from 'clear-router/decorators'
import { Router } from 'clear-router/express'
import { request } from 'parasito'

describe('@Bind() — Controllers', () => {
    let app: express.Application
    let router: ExRouter

    const setupApp = async (): Promise<void> => {
        Router.apply(router)
        app.use(router)
    }

    beforeEach(() => {
        Router.reset()
        Container.clear()

        app = express()
        router = ExRouter()
        app.use(express.json())
    })

    class UserController extends BaseController {
        @Bind()
        async test (req: Request) {
            return req.url ?? ''
        }
    }

    it('can setup basic route', async () => {
        Router.get('/test', ({ res }) => res.send('OK'))
        await setupApp()
        await request(app).get('/test').expect(200).expect('OK')
    })

    it('can use container injection in controllers', async () => {
        Router.get('/test/:id', [UserController, 'test'])
        await setupApp()
        await request(app).get('/test/1541').expect(200).expect('/test/1541')
    })
})
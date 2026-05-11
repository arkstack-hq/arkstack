import 'clear-router/decorators/setup'

import { Controller as BaseController, Request } from 'clear-router'
import { beforeEach, describe, it } from 'vitest'

import { Bind } from 'clear-router/decorators'
import { Container } from 'clear-router/decorators'
import { H3 } from 'h3'
import { Router } from 'clear-router/h3'
import { request } from 'parasito'

describe('@Bind() — Controllers', () => {
    let app: H3

    const setupApp = async (): Promise<void> => {
        Router.apply(app)
    }

    beforeEach(() => {
        Router.reset()
        Container.clear()

        app = new H3()
    })

    class UserController extends BaseController {
        @Bind()
        async test (req: Request) {
            return req.path ?? ''
        }
    }

    it('can setup basic route', async () => {
        Router.get('/test', () => 'OK')
        await setupApp()
        await request(app).get('/test').expect(200).expect('OK')
    })

    it('can use container injection in controllers', async () => {
        Router.get('/test/:id', [UserController, 'test'])
        await setupApp()
        await request(app).get('/test/1541').expect(200).expect('/test/1541')
    })
})
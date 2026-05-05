import express from 'express'
import request from 'parasito'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { Router as ClearRouter } from 'clear-router/express'

import { Auth } from '../../packages/auth/src'
import { Hash } from '../../packages/common/src'
import { auth, type AuthenticatedExpressRequest } from '../../packages/driver-express/src/middlewares/auth'
import { authSecret, cleanupAuthRecords, createAuthToken, createAuthUser, createPersonalAccessToken } from '../../packages/auth/tests/fixtures/auth'

const createRouter = (name: string) => class TestRouter extends ClearRouter {
    protected static routerStateNamespace = `express-auth-docs:${name}`
}

describe('Express auth integration', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = authSecret
    })

    afterAll(cleanupAuthRecords)

    it('authenticates requests through the Express middleware stack', async () => {
        const user = await createAuthUser()
        const token = await createAuthToken(user.id)

        await createPersonalAccessToken(user.id, token)

        const app = express()

        app.use(auth)
        app.get('/test', (req, res) => {
            const authReq = req as AuthenticatedExpressRequest

            res.status(200).json({
                authToken: authReq.authToken,
                authUserId: authReq.authUser?.id,
                userId: authReq.user?.id,
            })
        })

        const response = await request(app)
            .get('/test')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)

        expect(String(response.body.userId)).toBe(String(user.id))
        expect(String(response.body.authUserId)).toBe(String(user.id))
        expect(response.body.authToken).toBe(token)
    })

    it('returns an authentication error when the bearer token is missing', async () => {
        const app = express()

        app.use(auth)
        app.get('/test', (_req, res) => {
            res.status(200).json({ ok: true })
        })
        app.use((err: { message?: string; statusCode?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
            res.status(err.statusCode ?? 500).json({
                message: err.message,
                statusCode: err.statusCode,
            })
        })

        const response = await request(app)
            .get('/test')
            .expect(401)

        expect(response.body).toEqual({
            message: 'Unauthenticated',
            statusCode: 401,
        })
    })

    it('supports the documented Clear Router login route pattern', async () => {
        const password = 'password'
        const user = await createAuthUser({
            password: await Hash.make(password),
        })
        const app = express()
        const router = express.Router()
        const Router = createRouter('login')

        Router.post('/auth/login', async ({ req, res }) => {
            const { email, password } = req.body
            const personalAccessToken = await Auth.make()
                .setRequest(req)
                .login(email, password)

            return res.status(200).json({
                token: personalAccessToken.token,
                userId: personalAccessToken.getAttribute('user')?.id,
            })
        })

        Router.apply(router)
        app.use(express.json())
        app.use(router)

        const response = await request(app)
            .post('/auth/login')
            .send({
                email: user.email,
                password,
            })
            .expect(200)

        expect(response.body.token).toEqual(expect.any(String))
        expect(String(response.body.userId)).toBe(String(user.id))
    })

    it('supports the documented Clear Router route middleware pattern', async () => {
        const user = await createAuthUser()
        const token = await createAuthToken(user.id)

        await createPersonalAccessToken(user.id, token)

        const app = express()
        const router = express.Router()
        const Router = createRouter('route-middleware')

        Router.get('/account', ({ req, res }) => {
            return res.status(200).json({
                authToken: req.authToken,
                userId: req.user?.id,
            })
        }, [auth])

        Router.apply(router)
        app.use(router)

        const response = await request(app)
            .get('/account')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)

        expect(response.body.authToken).toBe(token)
        expect(String(response.body.userId)).toBe(String(user.id))
    })

    it('supports the documented Clear Router group middleware pattern', async () => {
        const user = await createAuthUser()
        const token = await createAuthToken(user.id)

        await createPersonalAccessToken(user.id, token)

        const app = express()
        const router = express.Router()
        const Router = createRouter('group-middleware')

        await Router.group('/account', async () => {
            Router.get('/profile', ({ req, res }) => {
                return res.status(200).json({
                    userId: req.user?.id,
                })
            })

            Router.get('/sessions', async ({ req, res }) => {
                const session = await Auth.make()
                    .setRequest(req)
                    .currentSession()
                    .token()

                return res.status(200).json({
                    sessionToken: session?.token,
                })
            })
        }, [auth])

        Router.apply(router)
        app.use(router)

        const profile = await request(app)
            .get('/account/profile')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)

        const sessions = await request(app)
            .get('/account/sessions')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)

        expect(String(profile.body.userId)).toBe(String(user.id))
        expect(sessions.body.sessionToken).toBe(token)
    })
})

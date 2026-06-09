import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { authSecret, cleanupAuthRecords, createAuthToken, createAuthUser, createPersonalAccessToken } from './fixtures/auth'

import { Auth } from '../src'
import { Router as ClearRouter } from 'clear-router/express'
import { Hash } from '../../common/src'
import { auth } from '../../driver-express/src/middlewares/auth'
import express from 'express'
import request from 'parasito'

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
            const authReq = req

            res.status(200).json({
                authUserFromAuthId: authReq.auth?.user()?.id,
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
        expect(String(response.body.authUserFromAuthId)).toBe(String(user.id))
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
            const auth = Auth.make().setRequest(req as never)
            const personalAccessToken = await auth.login(email, password)

            return res.status(200).json({
                authMatches: req.auth === auth,
                authToken: req.authToken,
                authUserFromAuthId: req.auth?.user()?.id,
                authUserId: req.authUser?.id,
                token: personalAccessToken.token,
                userId: personalAccessToken.getAttribute('user')?.id,
                requestUserId: req.user?.id,
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
        expect(response.body.authMatches).toBe(true)
        expect(response.body.authToken).toBe(response.body.token)
        expect(String(response.body.authUserFromAuthId)).toBe(String(user.id))
        expect(String(response.body.authUserId)).toBe(String(user.id))
        expect(String(response.body.userId)).toBe(String(user.id))
        expect(String(response.body.requestUserId)).toBe(String(user.id))
    })

    it('sets complete authentication state when issuing a token during registration', async () => {
        const user = await createAuthUser()
        const app = express()
        const router = express.Router()
        const Router = createRouter('register')

        Router.post('/auth/register', async ({ req, res }) => {
            const auth = Auth.make().setRequest(req as never)
            const personalAccessToken = await auth.create(user)

            return res.status(201).json({
                authMatches: req.auth === auth,
                authToken: req.authToken,
                authUserFromAuthId: req.auth?.user()?.id,
                authUserId: req.authUser?.id,
                token: personalAccessToken.token,
                userId: req.user?.id,
            })
        })

        Router.apply(router)
        app.use(router)

        const response = await request(app)
            .post('/auth/register')
            .expect(201)

        expect(response.body.authMatches).toBe(true)
        expect(response.body.authToken).toBe(response.body.token)
        expect(String(response.body.authUserFromAuthId)).toBe(String(user.id))
        expect(String(response.body.authUserId)).toBe(String(user.id))
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
                    .setRequest(req as never)
                    .session()
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

import { H3 } from 'h3'
import request from 'parasito'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { Router as ClearRouter } from 'clear-router/h3'

import { auth, type AuthenticatedH3Context } from '../../packages/driver-h3/src/middlewares/auth'
import { authSecret, cleanupAuthRecords, createAuthToken, createAuthUser, createPersonalAccessToken } from '../../packages/auth/tests/fixtures/auth'

const createRouter = (name: string) => class TestRouter extends ClearRouter {
    protected static routerStateNamespace = `h3-auth-docs:${name}`
}

describe('H3 auth integration', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = authSecret
    })

    afterAll(cleanupAuthRecords)

    it('authenticates requests through the H3 middleware stack', async () => {
        const user = await createAuthUser()
        const token = await createAuthToken(user.id)

        await createPersonalAccessToken(user.id, token)

        const app = new H3()

        app.use(auth)
        app.use('/test', (event) => {
            const context = event.context as AuthenticatedH3Context

            return {
                authToken: context.authToken,
                authUserId: context.authUser?.id,
                userId: context.user?.id,
            }
        })

        const response = await request(app)
            .get('/test')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)

        expect(response.status).toBe(200)
        expect(String(response.body.userId)).toBe(String(user.id))
        expect(String(response.body.authUserId)).toBe(String(user.id))
        expect(response.body.authToken).toBe(token)
    })

    it('returns an authentication error when the bearer token is missing', async () => {
        const app = new H3({
            silent: true,
            onError: (err, event) => {
                event.res.status = (err as { statusCode?: number }).statusCode ?? 500

                return {
                    message: err instanceof Error ? err.message : String(err),
                    statusCode: event.res.status,
                }
            },
        })

        app.use(auth)
        app.use('/test', () => ({ ok: true }))

        const response = await request(app)
            .get('/test')
            .expect(401)
        const body = response.body

        expect(response.status).toBe(401)
        expect(body).toEqual({
            message: 'Unauthenticated',
            statusCode: 401,
        })
    })

    it('supports the documented Clear Router route middleware pattern', async () => {
        const user = await createAuthUser()
        const token = await createAuthToken(user.id)

        await createPersonalAccessToken(user.id, token)

        const app = new H3()
        const Router = createRouter('route-middleware')

        Router.get('/account', (event) => {
            const context = event.context as AuthenticatedH3Context

            return {
                authToken: context.authToken,
                userId: context.authUser?.id,
            }
        }, [auth])

        Router.apply(app)

        const response = await request(app)
            .get('/account')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)

        expect(response.status).toBe(200)
        expect(response.body.authToken).toBe(token)
        expect(String(response.body.userId)).toBe(String(user.id))
    })

    it('supports the documented Clear Router group middleware pattern', async () => {
        const user = await createAuthUser()
        const token = await createAuthToken(user.id)

        await createPersonalAccessToken(user.id, token)

        const app = new H3()
        const Router = createRouter('group-middleware')

        await Router.group('/account', async () => {
            Router.get('/profile', (event) => {
                const context = event.context as AuthenticatedH3Context

                return {
                    userId: context.authUser?.id,
                }
            })

            Router.get('/sessions', (event) => {
                const context = event.context as AuthenticatedH3Context

                return {
                    authToken: context.authToken,
                }
            })
        }, [auth])

        Router.apply(app)

        const profileResponse = await request(app)
            .get('/account/profile')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)

        const sessionResponse = await request(app)
            .get('/account/sessions')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)

        expect(profileResponse.status).toBe(200)
        expect(sessionResponse.status).toBe(200)
        expect(String(profileResponse.body.userId)).toBe(String(user.id))
        expect(sessionResponse.body.authToken).toBe(token)
    })
})

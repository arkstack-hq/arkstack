import { H3 } from 'h3'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { Router as ClearRouter } from 'clear-router/h3'

import { auth, type AuthenticatedH3Context } from '@arkstack/driver-h3/middlewares'
import { authSecret, cleanupAuthRecords, createAuthToken, createAuthUser, createPersonalAccessToken } from '../../packages/auth/tests/fixtures/auth'

const createRouter = (name: string) => class TestRouter extends ClearRouter {
    protected static routerStateNamespace = `h3-auth-docs:${name}`
}

describe('H3 auth middleware', () => {
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

        const response = await app.fetch(new Request('http://localhost/test', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            method: 'GET',
        }))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(String(body.userId)).toBe(String(user.id))
        expect(String(body.authUserId)).toBe(String(user.id))
        expect(body.authToken).toBe(token)
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

        const response = await app.fetch(new Request('http://localhost/test', {
            method: 'GET',
        }))
        const body = await response.json()

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

        const response = await app.fetch(new Request('http://localhost/account', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            method: 'GET',
        }))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.authToken).toBe(token)
        expect(String(body.userId)).toBe(String(user.id))
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

        const profileResponse = await app.fetch(new Request('http://localhost/account/profile', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            method: 'GET',
        }))
        const profile = await profileResponse.json()
        const sessionResponse = await app.fetch(new Request('http://localhost/account/sessions', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            method: 'GET',
        }))
        const session = await sessionResponse.json()

        expect(profileResponse.status).toBe(200)
        expect(sessionResponse.status).toBe(200)
        expect(String(profile.userId)).toBe(String(user.id))
        expect(session.authToken).toBe(token)
    })
})

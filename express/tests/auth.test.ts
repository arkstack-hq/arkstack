import express from 'express'
import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { auth, type AuthenticatedExpressRequest } from '@arkstack/driver-express/middlewares'
import { authSecret, cleanupAuthRecords, createAuthToken, createAuthUser, createPersonalAccessToken } from '../../packages/auth/tests/fixtures/auth'

describe('Express auth middleware', () => {
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
})

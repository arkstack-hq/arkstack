import type { NextFunction, Request, Response } from 'express'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { auth, type AuthenticatedExpressRequest } from '../src/middlewares/auth'
import { authSecret, cleanupAuthRecords, createAuthToken, createAuthUser, createPersonalAccessToken } from '../../auth/tests/fixtures/auth'

describe('Express auth middleware', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = authSecret
    })

    afterAll(cleanupAuthRecords)

    it('authorizes a bearer token and attaches the authenticated user to the request', async () => {
        const user = await createAuthUser()
        const token = await createAuthToken(user.id)
        const pat = await createPersonalAccessToken(user.id, token)
        const req = {
            headers: {
                authorization: `Bearer ${token}`,
            },
        } as Request & AuthenticatedExpressRequest
        const res = {} as Response
        const next = vi.fn() as NextFunction

        await auth(req, res, next)

        expect(req.user?.id).toBe(user.id)
        expect(req.authUser?.id).toBe(user.id)
        expect(req.authToken).toBe(token)
        expect(pat.token).toBe(token)
        expect(next).toHaveBeenCalledWith()
    })

    it('passes an authentication error to next when the bearer token is missing', async () => {
        const req = {
            headers: {},
        } as Request
        const res = {} as Response
        const next = vi.fn() as NextFunction

        await auth(req, res, next)

        expect(next).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenCalledWith(expect.objectContaining({
            name: 'AuthenticationException',
            message: 'Unauthenticated',
            statusCode: 401,
        }))
    })
})

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { authSecret, cleanupAuthRecords, createAuthToken, createAuthUser, createPersonalAccessToken } from '../../auth/tests/fixtures/auth'

import type { H3Event } from 'h3'
import { auth } from '../src/middlewares/auth'

describe('H3 auth middleware', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = authSecret
    })

    afterAll(cleanupAuthRecords)

    it('authorizes a bearer token and attaches the authenticated user to event context', async () => {
        const user = await createAuthUser()
        const token = await createAuthToken(user.id)

        await createPersonalAccessToken(user.id, token)

        const event = {
            context: {},
            req: {
                _url: { pathname: '/account' },
                headers: new Headers({
                    authorization: `Bearer ${token}`,
                }),
                method: 'GET',
                url: 'https://example.test/account',
            },
        } as unknown as H3Event
        const next = vi.fn().mockResolvedValue('ok')

        const result = await auth(event, next)

        expect(event.context.user?.id).toBe(user.id)
        expect(event.context.authUser?.id).toBe(user.id)
        expect(event.context.authToken).toBe(token)
        expect(next).toHaveBeenCalledWith()
        expect(result).toBe('ok')
    })

    it('throws an authentication error when the bearer token is missing', async () => {
        const event = {
            context: {},
            req: {
                _url: { pathname: '/account' },
                headers: new Headers(),
                method: 'GET',
                url: 'https://example.test/account',
            },
        } as unknown as H3Event
        const next = vi.fn()

        await expect(auth(event, next)).rejects.toMatchObject({
            name: 'AuthenticationException',
            message: 'Unauthenticated',
            statusCode: 401,
        })
        expect(next).not.toHaveBeenCalled()
    })
})

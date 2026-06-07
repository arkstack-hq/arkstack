import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { authSecret, cleanupAuthRecords, createAuthToken, createAuthUser, createPersonalAccessToken } from './fixtures/auth'

import { AuthSession } from '../src/AuthSession'
import { Request } from '@arkstack/http'

describe('Session', () => {

    beforeEach(() => {
        process.env.JWT_SECRET = authSecret
    })

    afterAll(cleanupAuthRecords)

    it('loads the personal access token for the current bearer token', async () => {
        const user = await createAuthUser()
        const token = await createAuthToken(user.id)
        const pat = await createPersonalAccessToken(user.id, token)
        const auth = {
            getRequest: () => Request.from({
                headers: {
                    authorization: `Bearer ${token}`,
                },
            }),
            logout: async () => undefined,
        }

        const session = new AuthSession(auth as never)
        const resolved = await session.token()

        expect(resolved?.id).toBe(pat.id)
        expect(resolved?.token).toBe(token)
    })

    it('returns null when the current request has no bearer token', async () => {
        const auth = {
            getRequest: () => Request.from({ headers: {} }),
            logout: async () => undefined,
        }
        const session = new AuthSession(auth as never)

        await expect(session.token()).resolves.toBeNull()
    })
})

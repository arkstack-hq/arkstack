import { describe, expect, it } from 'vitest'

import { AuthSession } from '../src/AuthSession'
import { Session } from '../../http/src'

describe('Auth Session', () => {
    it('extends the active HTTP session state', () => {
        const httpSession = new Session({ data: { intended: '/dashboard' } })
        const auth = {
            getRequest: () => undefined,
            logout: async () => undefined,
        }
        const authSession = new AuthSession(auth as never, httpSession as never)

        expect(authSession).toBeInstanceOf(Session)
        expect(authSession.get('intended')).toBe('/dashboard')

        authSession.put('notice', 'Welcome')

        expect(httpSession.get('notice')).toBe('Welcome')
    })
})

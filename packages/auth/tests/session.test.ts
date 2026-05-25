import { describe, expect, it } from 'vitest'

import { Session as AuthSession } from '../src/Session'
import { Session as HttpSession } from '../../http/src'

describe('Auth Session', () => {
    it('extends the active HTTP session state', () => {
        const httpSession = new HttpSession({ data: { intended: '/dashboard' } })
        const auth = {
            getRequest: () => undefined,
            logout: async () => undefined,
        }
        const authSession = new AuthSession(auth as never, httpSession as never)

        expect(authSession).toBeInstanceOf(HttpSession)
        expect(authSession.get('intended')).toBe('/dashboard')

        authSession.put('notice', 'Welcome')

        expect(httpSession.get('notice')).toBe('Welcome')
    })
})

import { decodeJwt } from 'jose'
import { describe, expect, it } from 'vitest'

import { Auth } from '../src/Auth'
import { authSecret } from './fixtures/auth'

type WithCreateJWT = { createJWT(payload: Record<string, unknown>): Promise<string> }

describe('Auth JWT', () => {
  it('issues a distinct token each time, even for the same user within one second', async () => {
    const auth = new Auth(authSecret) as unknown as WithCreateJWT
    const payload = { sub: '1', email: 'a@example.com' }

    const first = await auth.createJWT(payload)
    const second = await auth.createJWT(payload)

    // Same `sub` and the same one-second `iat`: only the `jti` tells them apart.
    expect(second).not.toBe(first)
    expect(decodeJwt(first).jti).toBeTruthy()
    expect(decodeJwt(second).jti).not.toBe(decodeJwt(first).jti)
  })
})

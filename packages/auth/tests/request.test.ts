import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { authSecret, cleanupAuthRecords, createAuthToken, createAuthUser } from './fixtures/auth'

import { Request as ArkstackRequest } from '../../http/src'
import { Auth } from '../src'
import { AuthenticationException } from '../src/Exceptions/AuthenticationException'
import { Hash } from '../../common/src'

type AuthRequest = NonNullable<ReturnType<Auth['getRequest']>>

const makeRequest = (headers: Record<string, string> = {}) =>
  ArkstackRequest.from({
    headers,
    method: 'POST',
    url: '/',
    path: '/',
    ip: '127.0.0.1',
  } as never) as never as AuthRequest

describe('Auth request', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = authSecret
  })

  afterEach(() => {
    ;(Auth as unknown as { req?: unknown }).req = undefined
  })

  afterAll(cleanupAuthRecords)

  it('serves its own request ahead of the static fallback', () => {
    const fallback = makeRequest()
    const own = makeRequest()

    Auth.setRequest(fallback)

    expect(Auth.make().getRequest()).toBe(fallback)
    expect(Auth.make().setRequest(own).getRequest()).toBe(own)
    expect(new Auth(authSecret, own).getRequest()).toBe(own)
  })

  it('keeps one instance request from replacing another', () => {
    const first = Auth.make().setRequest(makeRequest())
    const second = Auth.make().setRequest(makeRequest())

    expect(first.getRequest()).not.toBe(second.getRequest())
  })

  it('refuses an unknown account and a wrong password', async () => {
    const user = await createAuthUser({ password: await Hash.make('password') })
    const auth = Auth.make().setRequest(makeRequest())

    await expect(auth.attempt(`missing-${user.email}`, 'password')).rejects.toBeInstanceOf(AuthenticationException)
    await expect(auth.attempt(user.email, 'wrong')).rejects.toBeInstanceOf(AuthenticationException)
  })

  it('refuses invalid tokens', async () => {
    const auth = Auth.make().setRequest(makeRequest())
    const user = await createAuthUser()
    const unsaved = await createAuthToken(user.id)
    const missingUser = await auth.createTemporaryToken({ id: 0, email: 'none@example.com' } as never, '2fa')

    await expect(auth.authorizeToken('not-a-token')).rejects.toBeInstanceOf(AuthenticationException)
    await expect(auth.authorizeToken(unsaved)).rejects.toBeInstanceOf(AuthenticationException)
    await expect(auth.authorizeTemporaryToken('not-a-token', '2fa')).rejects.toBeInstanceOf(AuthenticationException)
    await expect(auth.authorizeTemporaryToken(missingUser, '2fa')).rejects.toBeInstanceOf(AuthenticationException)
  })

  it('clears authentication from the request it signed in', async () => {
    const password = 'password'
    const user = await createAuthUser({ password: await Hash.make(password) })
    const req = makeRequest()
    const auth = Auth.make().setRequest(req)
    const token = await auth.login(user.email, password)

    expect(req.auth).toBe(auth)

    await auth.logout(token)

    expect(req.auth).toBeUndefined()
  })
})

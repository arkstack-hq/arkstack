import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Hash } from '../src'
import { randomBytes } from 'node:crypto'

describe('Hash.otp', () => {
  let previous: string | undefined

  beforeEach(() => {
    previous = process.env.APP_KEY
    process.env.APP_KEY = randomBytes(32).toString('base64url')
  })

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.APP_KEY
    } else {
      process.env.APP_KEY = previous
    }
  })

  it('validates a code for the label it was generated for', () => {
    const token = Hash.otp(6, 'alice@example.com:reset', 900).generate()

    expect(Hash.otp(6, 'alice@example.com:reset', 900).validate({ token })).not.toBeNull()
  })

  it('gives each label its own secret', () => {
    const alice = Hash.otp(6, 'alice@example.com:reset', 900)
    const bob = Hash.otp(6, 'bob@example.com:reset', 900)

    expect(alice.secret.base32).not.toBe(bob.secret.base32)
    expect(bob.validate({ token: alice.generate() })).toBeNull()
  })

  it('derives the secret from the application key', () => {
    const before = Hash.otp(6, 'alice@example.com:reset', 900).secret.base32

    process.env.APP_KEY = randomBytes(32).toString('base64url')

    expect(Hash.otp(6, 'alice@example.com:reset', 900).secret.base32).not.toBe(before)
  })

  it('no longer uses the fixed secret', () => {
    expect(Hash.otp().secret.base32).not.toBe('US3WHSG7X5KAPV27VANWKQHF3SH3HULL')
  })
})

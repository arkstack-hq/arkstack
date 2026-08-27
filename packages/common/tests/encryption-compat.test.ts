import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

import { Encryption } from '../src'

/**
 * The implementation of `Encryption` exactly as it stood before it was moved
 * onto `@arkstack/encryption`, reproduced verbatim from git history.
 *
 * Every payload the current class writes must be readable by this one, and
 * every payload this one wrote must stay readable by the current class —
 * otherwise upgrading silently destroys stored ciphertexts.
 */
class LegacyEncryption {
    private static readonly algorithm = 'aes-256-gcm'

    private static getKey() {
        const secret = process.env.APP_KEY

        if (!secret) {
            throw new Error('APP_KEY is required to use Encryption. Run `ark key:generate`.')
        }

        return createHash('sha256').update(secret).digest()
    }

    static encrypt(value: string) {
        const iv = randomBytes(12)
        const cipher = createCipheriv(this.algorithm, this.getKey(), iv)
        const ciphertext = Buffer.concat([
            cipher.update(value, 'utf8'),
            cipher.final(),
        ])
        const authTag = cipher.getAuthTag()

        return [iv, authTag, ciphertext].map((part) => part.toString('base64url')).join(':')
    }

    static decrypt(payload: string) {
        const [iv, authTag, ciphertext] = payload.split(':')

        if (!iv || !authTag || !ciphertext) {
            throw new Error('Invalid encrypted payload format')
        }

        const decipher = createDecipheriv(
            this.algorithm,
            this.getKey(),
            Buffer.from(iv, 'base64url'),
        )

        decipher.setAuthTag(Buffer.from(authTag, 'base64url'))

        const plaintext = Buffer.concat([
            decipher.update(Buffer.from(ciphertext, 'base64url')),
            decipher.final(),
        ])

        return plaintext.toString('utf8')
    }
}

const VALUES = [
    'my-secret-value',
    'JBSWY3DPEHPK3PXP',
    'a'.repeat(10_000),
    'héllo wörld — 🔐 ünïcode',
    '{"json":true,"nested":{"a":[1,2,3]}}',
    ':::colons:::in:::value:::',
    ' leading and trailing ',
    '\n\t\r mixed whitespace \0 null byte',
]

// Both a base64url key of exactly 32 bytes (what `ark key:generate` writes, and
// the case where "is this raw key material?" detection could have diverged) and
// an arbitrary passphrase.
const KEYS = [
    randomBytes(32).toString('base64url'),
    'some-legacy-passphrase-that-is-not-base64url!',
]

describe('Encryption backwards compatibility', () => {
    let previous: string | undefined

    beforeAll(() => {
        previous = process.env.APP_KEY
    })

    afterAll(() => {
        if (previous === undefined) {
            delete process.env.APP_KEY
        } else {
            process.env.APP_KEY = previous
        }
    })

    for (const key of KEYS) {
        const label = key.length === 43 ? 'a generated APP_KEY' : 'a legacy passphrase'

        describe(`with ${label}`, () => {
            beforeAll(() => {
                process.env.APP_KEY = key
            })

            it.each(VALUES)('reads what the old implementation wrote: %j', (value) => {
                expect(Encryption.decrypt(LegacyEncryption.encrypt(value))).toBe(value)
            })

            it.each(VALUES)('writes what the old implementation can read: %j', (value) => {
                expect(LegacyEncryption.decrypt(Encryption.encrypt(value))).toBe(value)
            })

            it('derives byte-identical key material', () => {
                // Same key ⇒ a payload from one decrypts under the other, which
                // only holds if the derivation matches exactly.
                const payload = LegacyEncryption.encrypt('probe')

                expect(Encryption.decrypt(payload)).toBe('probe')
            })
        })
    }

    describe('error behaviour', () => {
        beforeAll(() => {
            process.env.APP_KEY = KEYS[0]!
        })

        it('throws the same message on a malformed payload', () => {
            for (const payload of ['', 'nope', 'a:b', 'onlyone']) {
                const legacy = (() => {
                    try {
                        LegacyEncryption.decrypt(payload)
                    } catch (error) {
                        return (error as Error).message
                    }
                })()

                expect(() => Encryption.decrypt(payload)).toThrow(legacy)
            }
        })

        it('throws the same message when the app key is missing', () => {
            delete process.env.APP_KEY

            expect(() => Encryption.encrypt('x')).toThrow('APP_KEY is required to use Encryption. Run `ark key:generate`.')
            expect(() => LegacyEncryption.encrypt('x')).toThrow('APP_KEY is required to use Encryption. Run `ark key:generate`.')

            process.env.APP_KEY = KEYS[0]!
        })

        it('rejects a payload from a different key, as before', () => {
            process.env.APP_KEY = KEYS[0]!
            const payload = Encryption.encrypt('secret')

            process.env.APP_KEY = KEYS[1]!
            expect(() => Encryption.decrypt(payload)).toThrow()
            expect(() => LegacyEncryption.decrypt(payload)).toThrow()

            process.env.APP_KEY = KEYS[0]!
        })
    })

    describe('call signatures', () => {
        beforeAll(() => {
            process.env.APP_KEY = KEYS[0]!
        })

        it('keeps encrypt/decrypt synchronous and string-returning', () => {
            const payload = Encryption.encrypt('value')

            expect(payload).toBeTypeOf('string')
            expect(payload).not.toBeInstanceOf(Promise)
            expect(Encryption.decrypt(payload)).toBeTypeOf('string')
        })

        it('keeps the documented payload shape', () => {
            expect(Encryption.encrypt('value')).toMatch(/^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]*$/)
        })

        it('behaves as the old implementation did when called unbound', () => {
            // Both reach for `this`, so a destructured reference has always
            // thrown. Pinned so the wrapper does not quietly change it.
            const { encrypt } = Encryption
            const { encrypt: legacyEncrypt } = LegacyEncryption

            expect(() => legacyEncrypt('value')).toThrow(TypeError)
            expect(() => encrypt('value')).toThrow(TypeError)
        })

        it('now round-trips an empty string, which the old implementation could not', () => {
            // The old `decrypt` rejected its own output for an empty value:
            // the ciphertext segment is '', and it guarded with `!ciphertext`.
            // Strictly a fix — no payload that used to decrypt stops decrypting.
            const payload = Encryption.encrypt('')

            expect(payload).toMatch(/:$/)
            expect(() => LegacyEncryption.decrypt(payload)).toThrow('Invalid encrypted payload format')
            expect(Encryption.decrypt(payload)).toBe('')
        })
    })
})

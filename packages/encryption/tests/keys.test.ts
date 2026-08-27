import { describe, expect, it } from 'vitest'

import { EncryptionKey, Keys } from '../src'

describe('Keys', () => {
    it('generates keys of the requested length', () => {
        expect(Keys.generate().length).toBe(32)
        expect(Keys.generate(16).length).toBe(16)
        expect(Keys.generate()).not.toEqual(Keys.generate())
    })

    it('generates transportable string keys', () => {
        const key = Keys.generateString()

        expect(key).toMatch(/^[A-Za-z0-9_-]+$/)
        expect(EncryptionKey.fromBase64Url(key).length).toBe(32)
    })

    it('generates unique tokens', () => {
        expect(Keys.token(16)).not.toBe(Keys.token(16))
    })

    it('compares keys in constant time', () => {
        const key = Keys.generate()

        expect(Keys.compare(key, key)).toBe(true)
        expect(Keys.compare(key, key.toBase64Url())).toBe(true)
        expect(Keys.compare(key, Keys.generate())).toBe(false)
        expect(Keys.compare(key, 'not a key at all !!')).toBe(false)
    })

    it('matches a passphrase against the key it produces', async () => {
        const secret = 'correct horse battery staple'

        expect(await Keys.matches(secret, await Keys.fromSecret(secret))).toBe(true)
        expect(await Keys.matches(secret, await Keys.fromSecret('wrong horse'))).toBe(false)
    })

    it('derives a reproducible key from a password', async () => {
        const first = await Keys.derive('hunter2', { iterations: 1_000 })
        const second = await Keys.derive('hunter2', { iterations: 1_000, salt: first.salt })
        const third = await Keys.derive('hunter3', { iterations: 1_000, salt: first.salt })

        expect(first.key.equals(second.key)).toBe(true)
        expect(first.key.equals(third.key)).toBe(false)
        expect(second.iterations).toBe(1_000)
    })

    it('produces stable, groupable fingerprints', async () => {
        const key = Keys.generate()

        expect(await Keys.fingerprint(key)).toBe(await Keys.fingerprint(key))
        expect(await Keys.fingerprint(key)).not.toBe(await Keys.fingerprint(Keys.generate()))
        expect(await Keys.fingerprint(key, { group: 8 })).toMatch(/^([0-9a-f]{8} ){3}[0-9a-f]{8}$/)
        expect(await Keys.fingerprint(key, { length: 8, encoding: 'base64url', group: 0 })).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('does not leak key bytes through JSON', () => {
        expect(JSON.stringify({ key: Keys.generate() })).toBe('{"key":"[EncryptionKey]"}')
    })

    it('rejects empty key material', () => {
        expect(() => new EncryptionKey(new Uint8Array(0))).toThrow(RangeError)
    })
})

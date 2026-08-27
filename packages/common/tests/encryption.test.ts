import { Cipher, Encryption, EncryptionKey, KeyPair, SecureChannel } from '../src'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createCipheriv, createHash, randomBytes } from 'node:crypto'

const APP_KEY = randomBytes(32).toString('base64url')

describe('Encryption', () => {
    let previous: string | undefined

    beforeAll(() => {
        previous = process.env.APP_KEY
        process.env.APP_KEY = APP_KEY
    })

    afterAll(() => {
        if (previous === undefined) {
            delete process.env.APP_KEY
        } else {
            process.env.APP_KEY = previous
        }
    })

    it('keeps the synchronous round-trip it has always had', () => {
        const payload = Encryption.encrypt('my-secret-value')

        expect(payload.split(':')).toHaveLength(3)
        expect(Encryption.decrypt(payload)).toBe('my-secret-value')
    })

    it('still reads payloads written by the previous implementation', () => {
        // Byte for byte what the old `Encryption.encrypt()` emitted: AES-256-GCM
        // under SHA-256 of APP_KEY. `APP_KEY` is itself 32 base64url bytes, so
        // this also pins that it is hashed rather than used as raw material.
        const iv = randomBytes(12)
        const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(APP_KEY).digest(), iv)
        const ciphertext = Buffer.concat([cipher.update('legacy value', 'utf8'), cipher.final()])
        const payload = [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join(':')

        expect(Encryption.decrypt(payload)).toBe('legacy value')
    })

    it('throws the documented error without an app key', () => {
        delete process.env.APP_KEY

        expect(() => Encryption.encrypt('x')).toThrow(/APP_KEY is required/)

        process.env.APP_KEY = APP_KEY
    })

    it('still honours the legacy TWO_FACTOR_ENCRYPTION_KEY variable', () => {
        delete process.env.APP_KEY
        process.env.TWO_FACTOR_ENCRYPTION_KEY = APP_KEY

        expect(Encryption.decrypt(Encryption.encrypt('legacy env'))).toBe('legacy env')

        delete process.env.TWO_FACTOR_ENCRYPTION_KEY
        process.env.APP_KEY = APP_KEY
    })

    it('rejects a payload encrypted under another key', () => {
        expect(() => Encryption.decrypt(Encryption.encrypt('x', 'another-secret'))).toThrow()
        expect(() => Encryption.decrypt('not-a-payload')).toThrow(/Invalid encrypted payload format/)
    })

    it('crosses the sync and async implementations', async () => {
        expect(await Encryption.decryptAsync(Encryption.encrypt('both ways'))).toBe('both ways')
        expect(Encryption.decrypt(await Encryption.encryptAsync('both ways'))).toBe('both ways')
    })

    it('is decryptable by a browser holding the same app key', async () => {
        const payload = Encryption.encrypt('server side')

        // What browser code would do with the same secret.
        expect(await Cipher.decrypt(payload, await EncryptionKey.fromSecret(APP_KEY))).toBe('server side')
    })

    it('exposes key generation and comparison', async () => {
        const key = Encryption.generateKey()

        expect(await Encryption.compareKeys(key, key)).toBe(true)
        expect(await Encryption.compareKeys(key, Encryption.generateKey())).toBe(false)
        expect(await Encryption.fingerprint()).toBe(await Encryption.fingerprint())
    })

    it('derives password based keys', async () => {
        const derived = await Encryption.deriveKey('hunter2', { iterations: 1_000 })
        const again = await Encryption.deriveKey('hunter2', { iterations: 1_000, salt: derived.salt })

        expect(derived.key.equals(again.key)).toBe(true)
    })

    it('opens end-to-end channels between two identities', async () => {
        const alice = await Encryption.generateKeyPair()
        const bob = await Encryption.generateKeyPair()

        const outbound = await Encryption.channel(alice.privateKey, bob.publicKey)
        const inbound = await Encryption.channel(bob.privateKey, alice.publicKey)

        expect(await inbound.decrypt(await outbound.encrypt('e2e'))).toBe('e2e')
        expect(await Encryption.safetyNumber(alice.publicKey, bob.publicKey))
            .toBe(await outbound.safetyNumber())
    })

    it('seals messages to a public key', async () => {
        const recipient = await Encryption.generateKeyPair()
        const payload = await Encryption.seal('for your eyes only', recipient.publicKey)

        expect(await Encryption.open(payload, recipient.privateKey)).toBe('for your eyes only')
    })

    it('re-exports the underlying primitives', () => {
        expect(Cipher).toBeTypeOf('function')
        expect(KeyPair).toBeTypeOf('function')
        expect(SecureChannel).toBeTypeOf('function')
    })
})

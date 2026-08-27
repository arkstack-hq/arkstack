import { createCipheriv, createHash, randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { Cipher } from '../src'
import { EncryptionKey } from '../src'
import { NodeCipher } from '../src/node'

/**
 * The browser only ever runs the Web Crypto path (`Cipher`), the legacy server
 * path is `node:crypto` (`NodeCipher`). These tests pin the two together: if
 * they ever diverge, end-to-end payloads stop crossing the runtime boundary.
 */
describe('node ↔ browser interop', () => {
    const secret = 'sV0hK9tGmqjS1sPnb1Hy8kEwUwuP3z4A'

    it('decrypts a node payload with the Web Crypto cipher', async () => {
        const payload = NodeCipher.encrypt('crosses the wire', NodeCipher.fromSecret(secret))

        expect(await Cipher.decrypt(payload, await EncryptionKey.fromSecret(secret))).toBe('crosses the wire')
    })

    it('decrypts a Web Crypto payload with the node cipher', async () => {
        const payload = await Cipher.encrypt('crosses back', await EncryptionKey.fromSecret(secret))

        expect(NodeCipher.decrypt(payload, NodeCipher.fromSecret(secret))).toBe('crosses back')
    })

    it('derives identical key material on both sides', async () => {
        expect(new Uint8Array(NodeCipher.fromSecret(secret)))
            .toEqual((await EncryptionKey.fromSecret(secret)).bytes)
    })

    it('resolves raw base64url keys identically on both sides', async () => {
        const key = EncryptionKey.generate().toBase64Url()

        expect(new Uint8Array(NodeCipher.resolve(key))).toEqual((await EncryptionKey.resolve(key)).bytes)
    })

    it('reads payloads written by the pre-existing Encryption implementation', async () => {
        // Reproduces exactly what `Encryption.encrypt()` produced before this
        // package existed, so stored ciphertexts keep decrypting.
        const legacy = (value: string) => {
            const iv = randomBytes(12)
            const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), iv)
            const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])

            return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join(':')
        }

        const payload = legacy('a two-factor secret')

        expect(NodeCipher.decrypt(payload, NodeCipher.fromSecret(secret))).toBe('a two-factor secret')
        expect(await Cipher.decrypt(payload, await EncryptionKey.fromSecret(secret))).toBe('a two-factor secret')
    })

    it('rejects a wrong key on the node side too', () => {
        const payload = NodeCipher.encrypt('secret', NodeCipher.fromSecret(secret))

        expect(() => NodeCipher.decrypt(payload, NodeCipher.fromSecret('wrong'))).toThrow()
    })

    it('compares node keys in constant time', () => {
        const key = NodeCipher.generateKey()

        expect(NodeCipher.compare(key, key)).toBe(true)
        expect(NodeCipher.compare(key, NodeCipher.generateKey())).toBe(false)
    })
})

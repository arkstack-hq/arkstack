import { describe, expect, it } from 'vitest'

import { Cipher, Codec, EncryptionKey } from '../src'

describe('Cipher', () => {
    it('round-trips a string', async () => {
        const key = EncryptionKey.generate()
        const payload = await Cipher.encrypt('the launch codes', key)

        expect(await Cipher.decrypt(payload, key)).toBe('the launch codes')
    })

    it('writes the documented payload shape', async () => {
        const payload = await Cipher.encrypt('x', EncryptionKey.generate())
        const [iv, tag, ciphertext] = payload.split(':')

        expect(payload.split(':')).toHaveLength(3)
        expect(Codec.decodeBase64Url(iv!)).toHaveLength(Cipher.ivLength)
        expect(Codec.decodeBase64Url(tag!)).toHaveLength(Cipher.tagLength)
        expect(Codec.decodeBase64Url(ciphertext!)).toHaveLength(1)
        expect(Cipher.looksLikePayload(payload)).toBe(true)
    })

    it('never emits the same payload twice', async () => {
        const cipher = Cipher.create()

        expect(await cipher.encrypt('same')).not.toBe(await cipher.encrypt('same'))
    })

    it('rejects a wrong key', async () => {
        const payload = await Cipher.encrypt('secret', EncryptionKey.generate())

        await expect(Cipher.decrypt(payload, EncryptionKey.generate())).rejects.toThrow(/Unable to decrypt/)
    })

    it('rejects tampered ciphertext', async () => {
        const key = EncryptionKey.generate()
        const [iv, tag, ciphertext] = (await Cipher.encrypt('secret', key)).split(':')

        const flipped = Codec.decodeBase64Url(ciphertext!)
        flipped[0] ^= 0xff

        await expect(
            Cipher.decrypt([iv, tag, Codec.encodeBase64Url(flipped)].join(':'), key),
        ).rejects.toThrow(/Unable to decrypt/)
    })

    it('rejects a malformed payload', async () => {
        await expect(Cipher.decrypt('nope', EncryptionKey.generate())).rejects.toThrow(/Invalid encrypted payload/)
    })

    it('binds additional authenticated data', async () => {
        const key = EncryptionKey.generate()
        const payload = await Cipher.encrypt('message', key, { aad: 'conversation-1' })

        expect(await Cipher.decrypt(payload, key, { aad: 'conversation-1' })).toBe('message')
        await expect(Cipher.decrypt(payload, key, { aad: 'conversation-2' })).rejects.toThrow()
        await expect(Cipher.decrypt(payload, key)).rejects.toThrow()
    })

    it('round-trips raw bytes', async () => {
        const cipher = Cipher.create()
        const bytes = new Uint8Array([0, 127, 128, 255])

        expect(await cipher.decryptBytes(await cipher.encryptBytes(bytes))).toEqual(bytes)
    })

    it('round-trips an empty string', async () => {
        const cipher = Cipher.create()

        expect(await cipher.decrypt(await cipher.encrypt(''))).toBe('')
    })

    it('treats a passphrase and its base64url key differently from raw material', async () => {
        const payload = await Cipher.encrypt('value', 'a-passphrase that is not a key')

        expect(await Cipher.decrypt(payload, 'a-passphrase that is not a key')).toBe('value')
        expect(await Cipher.decrypt(payload, await EncryptionKey.fromSecret('a-passphrase that is not a key'))).toBe('value')
    })
})

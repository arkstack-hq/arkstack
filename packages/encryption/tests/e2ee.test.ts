import { describe, expect, it } from 'vitest'

import { KeyPair, Keys, SealedBox, SecureChannel } from '../src'

describe('KeyPair', () => {
    it('exports and re-imports a key pair', async () => {
        const pair = await KeyPair.generate()
        const serialized = await pair.export()
        const restored = await KeyPair.import(serialized)

        expect(serialized.publicKey).toMatch(/^[A-Za-z0-9_-]+$/)
        expect(serialized.privateKey).toMatch(/^[A-Za-z0-9_-]+$/)
        expect(await restored.exportPublicKey()).toBe(serialized.publicKey)
    })

    it('recovers the public key from the private key alone', async () => {
        const serialized = await (await KeyPair.generate()).export()
        const recovered = await KeyPair.fromPrivateKey(serialized.privateKey)

        expect(await recovered.exportPublicKey()).toBe(serialized.publicKey)
        expect(recovered.isComplete).toBe(true)
    })

    it('wraps a peer public key without a private half', async () => {
        const peer = await KeyPair.fromPublicKey(await (await KeyPair.generate()).exportPublicKey())

        expect(peer.isComplete).toBe(false)
        await expect(peer.export()).rejects.toThrow(/without its private key/)
        await expect(peer.sharedBits(peer)).rejects.toThrow(/without a private key/)
    })

    it('fingerprints public keys', async () => {
        const pair = await KeyPair.generate()

        expect(await pair.fingerprint()).toBe(await pair.fingerprint())
        expect(await pair.fingerprint()).not.toBe(await (await KeyPair.generate()).fingerprint())
    })

    it('orders safety numbers deterministically', async () => {
        const alice = await (await KeyPair.generate()).exportPublicKey()
        const bob = await (await KeyPair.generate()).exportPublicKey()

        const number = await Keys.safetyNumber(alice, bob)

        expect(await Keys.safetyNumber(bob, alice)).toBe(number)
        expect(number.split(' ')).toHaveLength(12)
        expect(number).toMatch(/^(\d{5} ){11}\d{5}$/)
        expect(await Keys.confirmSafetyNumber(alice, bob, number)).toBe(true)
        expect(await Keys.confirmSafetyNumber(alice, bob, number.replace(/\s/g, ''))).toBe(true)
        expect(await Keys.confirmSafetyNumber(alice, bob, '00000 00000')).toBe(false)
    })

    it('recognises the same identity across representations', async () => {
        const pair = await KeyPair.generate()

        expect(await Keys.samePublicKey(pair, await pair.exportPublicKey())).toBe(true)
        expect(await Keys.samePublicKey(pair, await KeyPair.generate())).toBe(false)
    })
})

describe('SecureChannel', () => {
    it('agrees on the same key from both ends', async () => {
        const alice = await KeyPair.generate()
        const bob = await KeyPair.generate()

        const outbound = await SecureChannel.between(alice, await bob.exportPublicKey())
        const inbound = await SecureChannel.between(bob, await alice.exportPublicKey())

        expect(outbound.key.equals(inbound.key)).toBe(true)
        expect(await outbound.fingerprint()).toBe(await inbound.fingerprint())
        expect(await outbound.safetyNumber()).toBe(await inbound.safetyNumber())
    })

    it('encrypts in both directions', async () => {
        const alice = await KeyPair.generate()
        const bob = await KeyPair.generate()

        const outbound = await SecureChannel.between(alice, await bob.exportPublicKey())
        const inbound = await SecureChannel.between(bob, await alice.exportPublicKey())

        expect(await inbound.decrypt(await outbound.encrypt('hey bob'))).toBe('hey bob')
        expect(await outbound.decrypt(await inbound.encrypt('hey alice'))).toBe('hey alice')
    })

    it('works from a serialised private key', async () => {
        const alice = await (await KeyPair.generate()).export()
        const bob = await (await KeyPair.generate()).export()

        const outbound = await SecureChannel.between(alice.privateKey, bob.publicKey)
        const inbound = await SecureChannel.between(bob.privateKey, alice.publicKey)

        expect(await inbound.decrypt(await outbound.encrypt('serialised'))).toBe('serialised')
    })

    it('locks out a third party', async () => {
        const alice = await KeyPair.generate()
        const bob = await KeyPair.generate()
        const eve = await KeyPair.generate()

        const outbound = await SecureChannel.between(alice, await bob.exportPublicKey())
        const eavesdropper = await SecureChannel.between(eve, await alice.exportPublicKey())

        await expect(eavesdropper.decrypt(await outbound.encrypt('private'))).rejects.toThrow(/Unable to decrypt/)
    })

    it('separates channels by context', async () => {
        const alice = await KeyPair.generate()
        const bob = await KeyPair.generate()

        const chat = await SecureChannel.between(alice, await bob.exportPublicKey(), { info: 'chat:1' })
        const files = await SecureChannel.between(alice, await bob.exportPublicKey(), { info: 'files:1' })

        expect(chat.key.equals(files.key)).toBe(false)
    })

    it('refuses to open without a private key', async () => {
        const peer = await KeyPair.fromPublicKey(await (await KeyPair.generate()).exportPublicKey())

        await expect(SecureChannel.between(peer, peer)).rejects.toThrow(/requires the local private key/)
    })
})

describe('SealedBox', () => {
    it('seals to a public key and opens with the private key', async () => {
        const recipient = await (await KeyPair.generate()).export()
        const payload = await SealedBox.seal('anonymous tip', recipient.publicKey)

        expect(SealedBox.looksLikePayload(payload)).toBe(true)
        expect(payload.split(':')).toHaveLength(5)
        expect(await SealedBox.open(payload, recipient.privateKey)).toBe('anonymous tip')
    })

    it('is opaque to anyone else', async () => {
        const recipient = await KeyPair.generate()
        const other = await KeyPair.generate()

        const payload = await SealedBox.seal('anonymous tip', await recipient.exportPublicKey())

        await expect(SealedBox.open(payload, other)).rejects.toThrow(/Unable to decrypt/)
    })

    it('uses a fresh ephemeral key per message', async () => {
        const recipient = await (await KeyPair.generate()).exportPublicKey()

        const first = await SealedBox.seal('same', recipient)
        const second = await SealedBox.seal('same', recipient)

        expect(first.split(':')[1]).not.toBe(second.split(':')[1])
    })

    it('rejects malformed payloads', async () => {
        const recipient = await KeyPair.generate()

        await expect(SealedBox.open('ark1:nope', recipient)).rejects.toThrow(/Invalid sealed payload/)
        await expect(SealedBox.open('a:b:c:d:e', recipient)).rejects.toThrow(/Invalid sealed payload/)
    })
})

import type { FingerprintOptions, SerializedKeyPair } from './types'
import { digest, subtle } from './support/subtle'

import { Codec } from './support/codec'
import { EncryptionKey } from './EncryptionKey'

const ALGORITHM: EcKeyGenParams = { name: 'ECDH', namedCurve: 'P-256' }

/**
 * An ECDH P-256 key pair — the identity half of end-to-end encryption.
 *
 * P-256 is the curve every mainstream Web Crypto implementation supports, so a
 * key pair generated in Node imports cleanly in the browser and vice versa.
 * Keys serialise to base64url DER (SPKI for public, PKCS#8 for private), which
 * survives JSON, headers, query strings and database columns unchanged.
 */
export class KeyPair {
    /**
     * @param publicKey
     * @param privateKey Absent for peer key pairs, where only the public half is known.
     */
    constructor(readonly publicKey: CryptoKey, readonly privateKey?: CryptoKey) { }

    /**
     * Generate a new key pair.
     *
     * @returns
     */
    static async generate(): Promise<KeyPair> {
        const pair = await subtle().generateKey(ALGORITHM, true, ['deriveBits']) as CryptoKeyPair

        return new KeyPair(pair.publicKey, pair.privateKey)
    }

    /**
     * Restore a key pair from its serialised form.
     *
     * @param serialized
     * @returns
     */
    static async import(serialized: SerializedKeyPair): Promise<KeyPair> {
        return new KeyPair(
            await this.importPublicKey(serialized.publicKey),
            await this.importPrivateKey(serialized.privateKey),
        )
    }

    /**
     * Restore a full key pair from the private half alone; the public key is
     * recovered from the private key's curve point.
     *
     * @param privateKey
     * @returns
     */
    static async fromPrivateKey(privateKey: string | CryptoKey): Promise<KeyPair> {
        const imported = typeof privateKey === 'string'
            ? await this.importPrivateKey(privateKey)
            : privateKey

        const jwk = await subtle().exportKey('jwk', imported)

        delete jwk.d
        jwk.key_ops = []

        const publicKey = await subtle().importKey('jwk', jwk, ALGORITHM, true, [])

        return new KeyPair(publicKey, imported)
    }

    /**
     * Wrap a peer's public key. The result can verify fingerprints and receive
     * sealed messages, but cannot derive shared secrets on its own.
     *
     * @param publicKey
     * @returns
     */
    static async fromPublicKey(publicKey: string | CryptoKey): Promise<KeyPair> {
        return new KeyPair(
            typeof publicKey === 'string' ? await this.importPublicKey(publicKey) : publicKey,
        )
    }

    /**
     * Import a base64url SPKI public key.
     *
     * @param publicKey
     * @returns
     */
    static async importPublicKey(publicKey: string): Promise<CryptoKey> {
        return await subtle().importKey(
            'spki',
            Codec.decodeBase64Url(publicKey) as unknown as BufferSource,
            ALGORITHM,
            true,
            [],
        )
    }

    /**
     * Import a base64url PKCS#8 private key.
     *
     * @param privateKey
     * @returns
     */
    static async importPrivateKey(privateKey: string): Promise<CryptoKey> {
        return await subtle().importKey(
            'pkcs8',
            Codec.decodeBase64Url(privateKey) as unknown as BufferSource,
            ALGORITHM,
            true,
            ['deriveBits'],
        )
    }

    /**
     * Export a public key to its base64url SPKI form.
     *
     * @param publicKey
     * @returns
     */
    static async exportPublicKey(publicKey: CryptoKey): Promise<string> {
        return Codec.encodeBase64Url(new Uint8Array(await subtle().exportKey('spki', publicKey)))
    }

    /**
     * Derive raw ECDH shared bits between a private key and a peer public key.
     *
     * The result is the raw curve point and must be stretched with a KDF before
     * use as a cipher key — {@link SecureChannel} does that for you.
     *
     * @param privateKey
     * @param peerPublicKey
     * @param length Output length in bits, defaults to the P-256 field size.
     * @returns
     */
    static async sharedBits(
        privateKey: CryptoKey,
        peerPublicKey: CryptoKey,
        length: number = 256,
    ): Promise<Uint8Array> {
        const bits = await subtle().deriveBits(
            { name: 'ECDH', public: peerPublicKey },
            privateKey,
            length,
        )

        return new Uint8Array(bits)
    }

    /**
     * A human comparable digest of a public key. Two peers reading the same
     * fingerprint aloud are holding the same key.
     *
     * @param publicKey
     * @param options
     * @returns
     */
    static async fingerprintOf(
        publicKey: string | CryptoKey,
        options: FingerprintOptions = {},
    ): Promise<string> {
        const exported = typeof publicKey === 'string'
            ? publicKey
            : await this.exportPublicKey(publicKey)

        return await new EncryptionKey(Codec.decodeBase64Url(exported)).fingerprint({
            group: 8,
            ...options,
        })
    }

    /**
     * The digest of both participants' public keys, ordered deterministically
     * so each side computes the same value. Rendered as five digit groups in
     * the style of a messaging app's safety number.
     *
     * @param first
     * @param second
     * @param groups How many five digit groups to render, defaults to 12.
     * @returns
     */
    static async safetyNumber(first: string, second: string, groups: number = 12): Promise<string> {
        const bytes = await digest(Codec.encodeUtf8(this.order(first, second).join('|')))

        const blocks: string[] = []

        for (let index = 0; index < groups; index += 1) {
            const offset = (index * 3) % (bytes.length - 3)
            const chunk = (bytes[offset]! << 16) | (bytes[offset + 1]! << 8) | bytes[offset + 2]!

            blocks.push(String(chunk % 100_000).padStart(5, '0'))
        }

        return blocks.join(' ')
    }

    /**
     * Order two public keys deterministically so both peers derive identical
     * salts and safety numbers regardless of who initiated.
     *
     * @param first
     * @param second
     * @returns
     */
    static order(first: string, second: string): [string, string] {
        return first <= second ? [first, second] : [second, first]
    }

    /**
     * Whether the private half is available.
     *
     * @returns
     */
    get isComplete(): boolean {
        return this.privateKey !== undefined
    }

    /**
     * Serialise both halves. Throws when the private key is missing.
     *
     * @returns
     */
    async export(): Promise<SerializedKeyPair> {
        if (!this.privateKey) {
            throw new Error('Cannot export a key pair without its private key')
        }

        return {
            publicKey: await this.exportPublicKey(),
            privateKey: Codec.encodeBase64Url(
                new Uint8Array(await subtle().exportKey('pkcs8', this.privateKey)),
            ),
        }
    }

    /**
     * The base64url SPKI public key, safe to publish.
     *
     * @returns
     */
    async exportPublicKey(): Promise<string> {
        return await KeyPair.exportPublicKey(this.publicKey)
    }

    /**
     * Derive the raw ECDH shared bits with a peer.
     *
     * @param peerPublicKey
     * @returns
     */
    async sharedBits(peerPublicKey: string | CryptoKey | KeyPair): Promise<Uint8Array> {
        if (!this.privateKey) {
            throw new Error('Cannot derive a shared secret without a private key')
        }

        return await KeyPair.sharedBits(this.privateKey, await KeyPair.resolvePublic(peerPublicKey))
    }

    /**
     * A comparable digest of this key pair's public key.
     *
     * @param options
     * @returns
     */
    async fingerprint(options: FingerprintOptions = {}): Promise<string> {
        return await KeyPair.fingerprintOf(this.publicKey, options)
    }

    /**
     * Normalise anything that can stand in for a public key.
     *
     * @param value
     * @returns
     */
    static async resolvePublic(value: string | CryptoKey | KeyPair): Promise<CryptoKey> {
        if (value instanceof KeyPair) {
            return value.publicKey
        }

        return typeof value === 'string' ? await this.importPublicKey(value) : value
    }
}

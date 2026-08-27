import type { ChannelOptions, CipherOptions, FingerprintOptions } from './types'

import { Cipher } from './Cipher'
import { Codec } from './support/codec'
import { EncryptionKey } from './EncryptionKey'
import { KeyPair } from './KeyPair'
import { digest } from './support/subtle'

const CONTEXT = 'arkstack/e2ee/v1'

/**
 * A two party end-to-end encrypted channel.
 *
 * Each side combines its own private key with the other side's public key over
 * ECDH, stretches the result with HKDF-SHA256, and ends up holding the exact
 * same AES-256-GCM key without that key ever crossing the wire. Messages
 * encrypted by either peer — in Node or in a browser — decrypt on the other.
 *
 * ```ts
 * const alice = await KeyPair.generate()
 * const bob = await KeyPair.generate()
 *
 * const outbound = await SecureChannel.between(alice, await bob.exportPublicKey())
 * const inbound = await SecureChannel.between(bob, await alice.exportPublicKey())
 *
 * await inbound.decrypt(await outbound.encrypt('hey')) // 'hey'
 * ```
 */
export class SecureChannel {
    /**
     * @param cipher          The cipher bound to the derived shared key.
     * @param localPublicKey  This side's public key, base64url.
     * @param remotePublicKey The peer's public key, base64url.
     */
    private constructor(
        readonly cipher: Cipher,
        readonly localPublicKey: string,
        readonly remotePublicKey: string,
    ) { }

    /**
     * Open a channel between a local key pair (or private key) and a peer's
     * public key.
     *
     * @param local
     * @param peerPublicKey
     * @param options
     * @returns
     */
    static async between(
        local: KeyPair | string | CryptoKey,
        peerPublicKey: KeyPair | string | CryptoKey,
        options: ChannelOptions = {},
    ): Promise<SecureChannel> {
        const pair = local instanceof KeyPair ? local : await KeyPair.fromPrivateKey(local)

        if (!pair.isComplete) {
            throw new Error('A secure channel requires the local private key')
        }

        const remote = await KeyPair.resolvePublic(peerPublicKey)

        const localPublicKey = await pair.exportPublicKey()
        const remotePublicKey = await KeyPair.exportPublicKey(remote)

        const key = await EncryptionKey.expand(
            await pair.sharedBits(remote),
            await this.salt(localPublicKey, remotePublicKey),
            options.info ? `${CONTEXT}:${options.info}` : CONTEXT,
        )

        return new SecureChannel(new Cipher(key), localPublicKey, remotePublicKey)
    }

    /**
     * The HKDF salt for a pair of participants: a digest over both public keys
     * in a deterministic order, so both sides compute the same value.
     *
     * @param first
     * @param second
     * @returns
     */
    static async salt(first: string, second: string): Promise<Uint8Array> {
        return await digest(Codec.encodeUtf8(KeyPair.order(first, second).join('|')))
    }

    /**
     * The shared key both peers derived. Persist it only if you intend to skip
     * the handshake later; it is as sensitive as the messages themselves.
     *
     * @returns
     */
    get key(): EncryptionKey {
        return this.cipher.key
    }

    /**
     * Encrypt a message for the peer.
     *
     * @param message
     * @param options
     * @returns
     */
    async encrypt(message: string, options: CipherOptions = {}): Promise<string> {
        return await this.cipher.encrypt(message, options)
    }

    /**
     * Decrypt a message from the peer.
     *
     * @param payload
     * @param options
     * @returns
     */
    async decrypt(payload: string, options: CipherOptions = {}): Promise<string> {
        return await this.cipher.decrypt(payload, options)
    }

    /**
     * Fingerprint of the derived shared key. Identical on both sides, and the
     * cheapest way to assert two peers really did agree on the same secret.
     *
     * @param options
     * @returns
     */
    async fingerprint(options: FingerprintOptions = {}): Promise<string> {
        return await this.key.fingerprint({ length: 16, group: 8, ...options })
    }

    /**
     * The conversation's safety number: show it to both participants so they
     * can confirm out of band that nobody is sitting in the middle.
     *
     * @param groups
     * @returns
     */
    async safetyNumber(groups: number = 12): Promise<string> {
        return await KeyPair.safetyNumber(this.localPublicKey, this.remotePublicKey, groups)
    }
}

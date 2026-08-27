import type { DeriveOptions, DerivedKey, FingerprintOptions, KeyInput, SerializedKeyPair } from './types'

import { Codec } from './support/codec'
import { EncryptionKey } from './EncryptionKey'
import { KeyPair } from './KeyPair'
import { randomBytes } from './support/subtle'

/**
 * Key generation and comparison helpers.
 *
 * Generating keys is easy to get wrong quietly and comparing them is easy to
 * get wrong dangerously, so both live here: every comparison in this class runs
 * in constant time, and every generator draws from the platform CSPRNG.
 */
export class Keys {
    /**
     * Generate a random symmetric key.
     *
     * @param length Key length in bytes, defaults to 32 (AES-256).
     * @returns
     */
    static generate(length: number = 32): EncryptionKey {
        return EncryptionKey.generate(length)
    }

    /**
     * Generate a random symmetric key as a base64url string, ready to store in
     * an environment variable or a database column.
     *
     * @param length
     * @returns
     */
    static generateString(length: number = 32): string {
        return this.generate(length).toBase64Url()
    }

    /**
     * Generate a random, URL safe token. Not a key — use it for invites,
     * one-time links and other opaque identifiers.
     *
     * @param bytes
     * @returns
     */
    static token(bytes: number = 32): string {
        return Codec.encodeBase64Url(randomBytes(bytes))
    }

    /**
     * Generate an end-to-end encryption identity: an ECDH key pair whose public
     * half is published and whose private half never leaves its owner.
     *
     * @returns
     */
    static async generatePair(): Promise<KeyPair> {
        return await KeyPair.generate()
    }

    /**
     * Generate an identity and return it already serialised for storage or
     * transport.
     *
     * @returns
     */
    static async generateSerializedPair(): Promise<SerializedKeyPair> {
        return await (await KeyPair.generate()).export()
    }

    /**
     * Hash an arbitrary secret into a key with SHA-256, the same way Arkstack
     * turns `APP_KEY` into a cipher key.
     *
     * @param secret
     * @returns
     */
    static async fromSecret(secret: string): Promise<EncryptionKey> {
        return await EncryptionKey.fromSecret(secret)
    }

    /**
     * Stretch a user supplied password into a key with PBKDF2-HMAC-SHA256.
     *
     * @param password
     * @param options
     * @returns
     */
    static async derive(password: string, options: DeriveOptions = {}): Promise<DerivedKey> {
        return await EncryptionKey.derive(password, options)
    }

    /**
     * Constant time comparison of two keys already in key form.
     *
     * @param left
     * @param right
     * @returns
     */
    static compare(
        left: EncryptionKey | Uint8Array | string,
        right: EncryptionKey | Uint8Array | string,
    ): boolean {
        try {
            return EncryptionKey.compare(left, right)
        } catch {
            return false
        }
    }

    /**
     * Constant time comparison that first resolves both sides through the same
     * rules the ciphers use, so a passphrase can be checked against the key it
     * produces.
     *
     * @param left
     * @param right
     * @param length Expected key length in bytes.
     * @returns
     */
    static async matches(left: KeyInput, right: KeyInput, length: number = 32): Promise<boolean> {
        try {
            return EncryptionKey.compare(
                await EncryptionKey.resolve(left, length),
                await EncryptionKey.resolve(right, length),
            )
        } catch {
            return false
        }
    }

    /**
     * A displayable digest of a symmetric key.
     *
     * @param key
     * @param options
     * @returns
     */
    static async fingerprint(key: KeyInput, options: FingerprintOptions = {}): Promise<string> {
        return await (await EncryptionKey.resolve(key)).fingerprint({ length: 16, group: 8, ...options })
    }

    /**
     * A displayable digest of a public key, for comparing identities.
     *
     * @param publicKey
     * @param options
     * @returns
     */
    static async fingerprintPublicKey(
        publicKey: string | CryptoKey,
        options: FingerprintOptions = {},
    ): Promise<string> {
        return await KeyPair.fingerprintOf(publicKey, { length: 16, group: 8, ...options })
    }

    /**
     * The safety number for a conversation between two public keys. Both peers
     * compute the same string; showing it side by side proves no third party
     * substituted a key in transit.
     *
     * @param first
     * @param second
     * @param groups
     * @returns
     */
    static async safetyNumber(first: string, second: string, groups: number = 12): Promise<string> {
        return await KeyPair.safetyNumber(first, second, groups)
    }

    /**
     * Confirm a safety number a user read out or scanned, in constant time.
     *
     * @param first
     * @param second
     * @param expected
     * @returns
     */
    static async confirmSafetyNumber(first: string, second: string, expected: string): Promise<boolean> {
        const normalize = (value: string) => Codec.encodeUtf8(value.replace(/\s+/g, ''))

        return Codec.equals(
            normalize(await this.safetyNumber(first, second)),
            normalize(expected),
        )
    }

    /**
     * Whether two public keys refer to the same identity.
     *
     * @param left
     * @param right
     * @returns
     */
    static async samePublicKey(
        left: string | CryptoKey | KeyPair,
        right: string | CryptoKey | KeyPair,
    ): Promise<boolean> {
        const exported = async (value: string | CryptoKey | KeyPair) => {
            if (typeof value === 'string') {
                return value
            }

            return await KeyPair.exportPublicKey(await KeyPair.resolvePublic(value))
        }

        return Codec.equals(
            Codec.decodeBase64Url(await exported(left)),
            Codec.decodeBase64Url(await exported(right)),
        )
    }
}

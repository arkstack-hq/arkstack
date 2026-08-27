import {
    Cipher,
    Codec,
    EncryptionKey,
    KeyPair,
    Keys,
    SealedBox,
    SecureChannel,
} from '@arkstack/encryption'
import type {
    ChannelOptions,
    CipherOptions,
    DeriveOptions,
    DerivedKey,
    FingerprintOptions,
    KeyInput,
    SerializedKeyPair,
} from '@arkstack/encryption'

import { NodeCipher } from '@arkstack/encryption/node'
import { appKey } from '../system'

export {
    Cipher,
    Codec,
    EncryptionKey,
    KeyPair,
    Keys,
    NodeCipher,
    SealedBox,
    SecureChannel,
}

export type {
    ChannelOptions,
    CipherOptions,
    DeriveOptions,
    DerivedKey,
    FingerprintOptions,
    KeyInput,
    SerializedKeyPair,
}

/**
 * Application facing encryption, bound to the app key.
 *
 * This is a thin wrapper over `@arkstack/encryption`. `encrypt()` and
 * `decrypt()` keep the synchronous signatures and the exact payload format
 * they have always had — `<iv>:<authTag>:<ciphertext>`, AES-256-GCM under
 * SHA-256 of `APP_KEY` — so existing ciphertexts and call sites are unaffected.
 *
 * Everything else is new surface: the asynchronous methods run on the Web
 * Crypto API, which means a browser holding the same key (or the same key pair
 * peer) can decrypt what the server wrote, and the server can decrypt what the
 * browser wrote.
 */
export class Encryption {
    /**
     * Encrypt a string with the application key.
     *
     * @param value
     * @param key Override the application key for this call.
     * @returns
     */
    static encrypt(value: string, key?: KeyInput) {
        return NodeCipher.encrypt(value, this.material(key))
    }

    /**
     * Decrypt a payload produced by {@link encrypt}.
     *
     * @param payload
     * @param key Override the application key for this call.
     * @returns
     */
    static decrypt(payload: string, key?: KeyInput) {
        return NodeCipher.decrypt(payload, this.material(key))
    }

    /**
     * Encrypt through the isomorphic Web Crypto implementation.
     *
     * Produces the same payload format as {@link encrypt}; use it when the
     * calling code is (or may become) shared with the browser.
     *
     * @param value
     * @param key
     * @param options
     * @returns
     */
    static async encryptAsync(value: string, key?: KeyInput, options: CipherOptions = {}) {
        return await (await this.cipher(key)).encrypt(value, options)
    }

    /**
     * Decrypt through the isomorphic Web Crypto implementation.
     *
     * @param payload
     * @param key
     * @param options
     * @returns
     */
    static async decryptAsync(payload: string, key?: KeyInput, options: CipherOptions = {}) {
        return await (await this.cipher(key)).decrypt(payload, options)
    }

    /**
     * A cipher bound to the application key, for encrypting many values or raw
     * bytes without re-deriving the key each time.
     *
     * @param key
     * @returns
     */
    static async cipher(key?: KeyInput): Promise<Cipher> {
        return key === undefined
            ? new Cipher(new EncryptionKey(this.material()))
            : await Cipher.from(key)
    }

    /**
     * The application key as it appears in the environment.
     *
     * Reads `APP_KEY`, falling back to the legacy `TWO_FACTOR_ENCRYPTION_KEY`
     * variable. Override this in a subclass to source the key elsewhere.
     *
     * @returns
     */
    protected static secret(): string {
        const secret = appKey('TWO_FACTOR_ENCRYPTION_KEY')

        if (!secret) {
            throw new Error('APP_KEY is required to use Encryption. Run `ark key:generate`.')
        }

        return secret
    }

    /**
     * The 32 bytes of key material actually handed to the cipher: SHA-256 of
     * the application key, or of an explicit override.
     *
     * The same bytes are reachable in the browser with
     * `EncryptionKey.fromSecret(secret)`.
     *
     * @param key
     * @returns
     */
    static material(key?: KeyInput): Uint8Array {
        if (key === undefined) {
            return NodeCipher.fromSecret(this.secret())
        }

        if (key instanceof EncryptionKey) {
            return key.bytes
        }

        if (key instanceof Uint8Array) {
            return key
        }

        if (typeof key === 'string') {
            return NodeCipher.resolve(key)
        }

        throw new TypeError('A CryptoKey cannot be used with the synchronous cipher; pass raw key material instead')
    }

    /**
     * Generate a random base64url encryption key.
     *
     * @param length Key length in bytes, defaults to 32.
     * @returns
     */
    static generateKey(length: number = 32): string {
        return Keys.generateString(length)
    }

    /**
     * Generate an end-to-end encryption identity. The public key is published,
     * the private key stays with its owner.
     *
     * @returns
     */
    static async generateKeyPair(): Promise<SerializedKeyPair> {
        return await Keys.generateSerializedPair()
    }

    /**
     * Stretch a user supplied password into a key with PBKDF2-HMAC-SHA256.
     *
     * @param password
     * @param options
     * @returns
     */
    static async deriveKey(password: string, options: DeriveOptions = {}): Promise<DerivedKey> {
        return await Keys.derive(password, options)
    }

    /**
     * Constant time comparison of two keys.
     *
     * @param left
     * @param right
     * @returns
     */
    static compareKeys(left: KeyInput, right: KeyInput): Promise<boolean> {
        return Keys.matches(left, right)
    }

    /**
     * A displayable digest of a key, safe to show to users or write to logs.
     *
     * @param key Defaults to the application key.
     * @param options
     * @returns
     */
    static async fingerprint(key?: KeyInput, options: FingerprintOptions = {}): Promise<string> {
        return await Keys.fingerprint(key ?? this.material(), options)
    }

    /**
     * Open an end-to-end encrypted channel between a local private key and a
     * peer's public key. Neither key, nor the secret they agree on, ever
     * crosses the wire.
     *
     * @param privateKey
     * @param peerPublicKey
     * @param options
     * @returns
     */
    static async channel(
        privateKey: string | KeyPair,
        peerPublicKey: string | KeyPair,
        options: ChannelOptions = {},
    ): Promise<SecureChannel> {
        return await SecureChannel.between(privateKey, peerPublicKey, options)
    }

    /**
     * Encrypt a message to a public key without needing a sender identity.
     *
     * @param message
     * @param recipientPublicKey
     * @returns
     */
    static async seal(message: string, recipientPublicKey: string | KeyPair): Promise<string> {
        return await SealedBox.seal(message, recipientPublicKey)
    }

    /**
     * Open a payload produced by {@link seal}.
     *
     * @param payload
     * @param recipientPrivateKey
     * @returns
     */
    static async open(payload: string, recipientPrivateKey: string | KeyPair): Promise<string> {
        return await SealedBox.open(payload, recipientPrivateKey)
    }

    /**
     * The safety number for a conversation between two public keys — show it to
     * both participants so they can verify nobody swapped a key in transit.
     *
     * @param first
     * @param second
     * @param groups
     * @returns
     */
    static async safetyNumber(first: string, second: string, groups: number = 12): Promise<string> {
        return await Keys.safetyNumber(first, second, groups)
    }
}

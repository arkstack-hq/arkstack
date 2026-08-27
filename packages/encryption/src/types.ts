import type { EncryptionKey } from './EncryptionKey'

/**
 * Anything that can stand in for a symmetric key.
 *
 * - `EncryptionKey`: an already materialised key.
 * - `Uint8Array`: raw key bytes (must match the cipher key length).
 * - `CryptoKey`: a Web Crypto key, used as-is.
 * - `string`: a base64url encoded key of the right length, otherwise treated as
 *   a passphrase and hashed with SHA-256 (matching Arkstack's `APP_KEY` behaviour).
 */
export type KeyInput = EncryptionKey | Uint8Array | CryptoKey | string

/**
 * A serialised, transport safe key pair. Both halves are base64url strings:
 * the public key is SPKI DER, the private key is PKCS#8 DER.
 */
export interface SerializedKeyPair {
    publicKey: string
    privateKey: string
}

/**
 * Optional per-operation cipher settings.
 */
export interface CipherOptions {
    /**
     * Additional authenticated data. Not encrypted, but bound to the
     * ciphertext: decryption fails unless the same value is supplied.
     */
    aad?: Uint8Array | string
}

/**
 * Options for password based key derivation (PBKDF2-HMAC-SHA256).
 */
export interface DeriveOptions {
    /**
     * Salt bytes or a base64url encoded salt. Generated when omitted.
     */
    salt?: Uint8Array | string
    /**
     * PBKDF2 iteration count. Defaults to 210,000 (OWASP 2023 guidance).
     */
    iterations?: number
    /**
     * Derived key length in bytes. Defaults to 32 (AES-256).
     */
    length?: number
}

/**
 * The result of a password based derivation, including the salt needed to
 * reproduce it.
 */
export interface DerivedKey {
    key: EncryptionKey
    salt: string
    iterations: number
}

/**
 * Options controlling how a shared secret is stretched into a channel key.
 */
export interface ChannelOptions {
    /**
     * Domain separation string mixed into the HKDF `info` parameter. Two peers
     * must use the same value to land on the same key.
     */
    info?: string
}

/**
 * Options for rendering a key fingerprint.
 */
export interface FingerprintOptions {
    /**
     * Number of digest bytes to render. Defaults to 32 (the full SHA-256).
     */
    length?: number
    /**
     * Output encoding. Defaults to `'hex'`.
     */
    encoding?: 'hex' | 'base64url'
    /**
     * When set, group the output into blocks of this many characters,
     * separated by spaces. Makes fingerprints readable for manual comparison.
     */
    group?: number
}

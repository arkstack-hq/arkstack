import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'

const IV_LENGTH = 12

const KEY_LENGTH = 32

/**
 * Key representations the synchronous Node cipher accepts.
 */
export type NodeKeyInput = Uint8Array | string

/**
 * Synchronous AES-256-GCM for Node, wire compatible with {@link Cipher}.
 *
 * The Web Crypto API is asynchronous everywhere, which is the right default but
 * a breaking change for code that already calls `Encryption.encrypt()` inline.
 * This entry point keeps that synchronous surface available on the server while
 * emitting the exact same `<iv>:<authTag>:<ciphertext>` payloads, so anything
 * encrypted here decrypts in a browser with `@arkstack/encryption` and vice
 * versa.
 *
 * Import it from `@arkstack/encryption/node`; it is deliberately kept out of
 * the main entry point so browser bundles never pull in `node:crypto`.
 */
export class NodeCipher {
    /** The cipher algorithm, matching the Web Crypto implementation. */
    static readonly algorithm = ALGORITHM

    /**
     * Encrypt a string.
     *
     * @param value
     * @param key
     * @returns
     */
    static encrypt(value: string, key: NodeKeyInput): string {
        const iv = randomBytes(IV_LENGTH)
        const cipher = createCipheriv(ALGORITHM, this.resolve(key), iv)

        const ciphertext = Buffer.concat([
            cipher.update(value, 'utf8'),
            cipher.final(),
        ])

        return [iv, cipher.getAuthTag(), ciphertext]
            .map((part) => part.toString('base64url'))
            .join(':')
    }

    /**
     * Decrypt a payload produced by {@link encrypt} or by the isomorphic
     * `Cipher`.
     *
     * @param payload
     * @param key
     * @returns
     */
    static decrypt(payload: string, key: NodeKeyInput): string {
        const [iv, authTag, ciphertext] = payload.split(':')

        if (!iv || !authTag || ciphertext === undefined) {
            throw new Error('Invalid encrypted payload format')
        }

        const decipher = createDecipheriv(
            ALGORITHM,
            this.resolve(key),
            Buffer.from(iv, 'base64url'),
        )

        decipher.setAuthTag(Buffer.from(authTag, 'base64url'))

        const plaintext = Buffer.concat([
            decipher.update(Buffer.from(ciphertext, 'base64url')),
            decipher.final(),
        ])

        return plaintext.toString('utf8')
    }

    /**
     * Generate a random base64url key.
     *
     * @param length
     * @returns
     */
    static generateKey(length: number = KEY_LENGTH): string {
        return randomBytes(length).toString('base64url')
    }

    /**
     * Hash an arbitrary secret into 32 bytes of key material with SHA-256.
     *
     * Byte for byte identical to `EncryptionKey.fromSecret()`, and unlike
     * {@link resolve} it never treats the secret as raw key material — which
     * matters for values such as `APP_KEY` that happen to be base64url of
     * exactly the key length.
     *
     * @param secret
     * @returns
     */
    static fromSecret(secret: string): Uint8Array {
        return createHash('sha256').update(secret).digest()
    }

    /**
     * Constant time comparison of two keys.
     *
     * @param left
     * @param right
     * @returns
     */
    static compare(left: NodeKeyInput, right: NodeKeyInput): boolean {
        try {
            const a = this.resolve(left)
            const b = this.resolve(right)

            return a.length === b.length && timingSafeEqual(a, b)
        } catch {
            return false
        }
    }

    /**
     * Turn any accepted representation into 32 bytes of key material, using the
     * same rules as the isomorphic implementation: a base64url string that
     * decodes to exactly the key length is raw material, anything else is a
     * passphrase hashed with SHA-256.
     *
     * @param key
     * @returns
     */
    static resolve(key: NodeKeyInput): Uint8Array {
        if (typeof key !== 'string') {
            return Buffer.from(key)
        }

        if (/^[A-Za-z0-9_-]+$/.test(key)) {
            const decoded = Buffer.from(key, 'base64url')

            if (decoded.length === KEY_LENGTH && decoded.toString('base64url') === key) {
                return decoded
            }
        }

        return createHash('sha256').update(key).digest()
    }
}

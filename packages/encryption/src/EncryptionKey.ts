import type { DeriveOptions, DerivedKey, FingerprintOptions, KeyInput } from './types'
import { digest, randomBytes, subtle } from './support/subtle'

import { Codec } from './support/codec'

const DEFAULT_ITERATIONS = 210_000

const DEFAULT_LENGTH = 32

/**
 * A symmetric key, held as raw bytes and convertible to every representation
 * the rest of the library (and the wire) needs.
 *
 * Keys are values: two keys with the same bytes are equal regardless of how
 * they were produced, and comparison is constant time.
 */
export class EncryptionKey {
    /**
     * @param bytes Raw key material.
     */
    constructor(readonly bytes: Uint8Array) {
        if (bytes.length === 0) {
            throw new RangeError('An encryption key cannot be empty')
        }
    }

    /**
     * Generate a random key.
     *
     * @param length Key length in bytes, defaults to 32 (AES-256).
     * @returns
     */
    static generate(length: number = DEFAULT_LENGTH): EncryptionKey {
        return new EncryptionKey(randomBytes(length))
    }

    /**
     * Derive a key from an arbitrary secret by hashing it with SHA-256.
     *
     * This mirrors how Arkstack turns `APP_KEY` into a cipher key, so a value
     * encrypted on the server with the app key can be decrypted in the browser
     * from the same secret.
     *
     * @param secret
     * @returns
     */
    static async fromSecret(secret: string): Promise<EncryptionKey> {
        return new EncryptionKey(await digest(Codec.encodeUtf8(secret)))
    }

    /**
     * Restore a key from its base64url representation.
     *
     * @param value
     * @returns
     */
    static fromBase64Url(value: string): EncryptionKey {
        return new EncryptionKey(Codec.decodeBase64Url(value))
    }

    /**
     * Restore a key from its hex representation.
     *
     * @param value
     * @returns
     */
    static fromHex(value: string): EncryptionKey {
        return new EncryptionKey(Codec.decodeHex(value))
    }

    /**
     * Stretch a password into a key using PBKDF2-HMAC-SHA256.
     *
     * Prefer this over {@link fromSecret} for anything a human typed; the
     * returned salt and iteration count must be stored alongside the
     * ciphertext to reproduce the key later.
     *
     * @param password
     * @param options
     * @returns
     */
    static async derive(password: string, options: DeriveOptions = {}): Promise<DerivedKey> {
        const iterations = options.iterations ?? DEFAULT_ITERATIONS
        const length = options.length ?? DEFAULT_LENGTH

        const salt = typeof options.salt === 'string'
            ? Codec.decodeBase64Url(options.salt)
            : options.salt ?? randomBytes(16)

        const material = await subtle().importKey(
            'raw',
            Codec.encodeUtf8(password) as unknown as BufferSource,
            'PBKDF2',
            false,
            ['deriveBits'],
        )

        const bits = await subtle().deriveBits(
            { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
            material,
            length * 8,
        )

        return {
            key: new EncryptionKey(new Uint8Array(bits)),
            salt: Codec.encodeBase64Url(salt),
            iterations,
        }
    }

    /**
     * Expand shared secret material into a key using HKDF-SHA256.
     *
     * Used internally by the ECDH channel and sealed box helpers, and exposed
     * because deriving sub-keys from one root key is a common need.
     *
     * @param material
     * @param salt
     * @param info
     * @param length
     * @returns
     */
    static async expand(
        material: Uint8Array,
        salt: Uint8Array,
        info: string,
        length: number = DEFAULT_LENGTH,
    ): Promise<EncryptionKey> {
        const base = await subtle().importKey(
            'raw',
            material as unknown as BufferSource,
            'HKDF',
            false,
            ['deriveBits'],
        )

        const bits = await subtle().deriveBits(
            {
                name: 'HKDF',
                hash: 'SHA-256',
                salt: salt as unknown as BufferSource,
                info: Codec.encodeUtf8(info) as unknown as BufferSource,
            },
            base,
            length * 8,
        )

        return new EncryptionKey(new Uint8Array(bits))
    }

    /**
     * Coerce any accepted key representation into an `EncryptionKey`.
     *
     * A string of exactly `length` bytes once base64url decoded is treated as
     * raw key material; anything else is treated as a passphrase and hashed.
     *
     * @param input
     * @param length Expected key length in bytes.
     * @returns
     */
    static async resolve(input: KeyInput, length: number = DEFAULT_LENGTH): Promise<EncryptionKey> {
        if (input instanceof EncryptionKey) {
            return input
        }

        if (input instanceof Uint8Array) {
            return new EncryptionKey(input)
        }

        if (typeof input === 'string') {
            if (/^[A-Za-z0-9_-]+$/.test(input)) {
                try {
                    const decoded = Codec.decodeBase64Url(input)

                    if (decoded.length === length) {
                        return new EncryptionKey(decoded)
                    }
                } catch { /** Fall through to the passphrase path. */ }
            }

            return await this.fromSecret(input)
        }

        const exported = await subtle().exportKey('raw', input)

        return new EncryptionKey(new Uint8Array(exported))
    }

    /**
     * Constant time comparison of two keys, in any representation that does not
     * require asynchronous work.
     *
     * @param left
     * @param right
     * @returns
     */
    static compare(
        left: EncryptionKey | Uint8Array | string,
        right: EncryptionKey | Uint8Array | string,
    ): boolean {
        return Codec.equals(this.materialize(left), this.materialize(right))
    }

    /**
     * Import this key into Web Crypto for the given algorithm.
     *
     * @param algorithm
     * @param usages
     * @returns
     */
    async cryptoKey(
        algorithm: AlgorithmIdentifier | AesKeyAlgorithm | HmacImportParams = { name: 'AES-GCM' },
        usages: KeyUsage[] = ['encrypt', 'decrypt'],
    ): Promise<CryptoKey> {
        return await subtle().importKey(
            'raw',
            this.bytes as unknown as BufferSource,
            algorithm,
            false,
            usages,
        )
    }

    /**
     * A stable, shareable digest of this key. Safe to log or display; it does
     * not reveal the key itself.
     *
     * @param options
     * @returns
     */
    async fingerprint(options: FingerprintOptions = {}): Promise<string> {
        const bytes = (await digest(this.bytes)).slice(0, options.length ?? 32)

        const rendered = options.encoding === 'base64url'
            ? Codec.encodeBase64Url(bytes)
            : Codec.encodeHex(bytes)

        if (!options.group) {
            return rendered
        }

        return rendered.match(new RegExp(`.{1,${options.group}}`, 'g'))?.join(' ') ?? rendered
    }

    /**
     * Constant time comparison against another key.
     *
     * @param other
     * @returns
     */
    equals(other: EncryptionKey | Uint8Array | string): boolean {
        return EncryptionKey.compare(this, other)
    }

    /**
     * Key length in bytes.
     *
     * @returns
     */
    get length(): number {
        return this.bytes.length
    }

    /**
     * Base64url representation, the format used to persist and transport keys.
     *
     * @returns
     */
    toBase64Url(): string {
        return Codec.encodeBase64Url(this.bytes)
    }

    /**
     * Hex representation.
     *
     * @returns
     */
    toHex(): string {
        return Codec.encodeHex(this.bytes)
    }

    /**
     * Base64url representation.
     *
     * @returns
     */
    toString(): string {
        return this.toBase64Url()
    }

    /**
     * Keep keys out of accidental `JSON.stringify` output of surrounding
     * objects by requiring an explicit `toBase64Url()` call.
     *
     * @returns
     */
    toJSON(): string {
        return '[EncryptionKey]'
    }

    /**
     * Reduce a comparable key representation to bytes.
     *
     * @param value
     * @returns
     */
    private static materialize(value: EncryptionKey | Uint8Array | string): Uint8Array {
        if (value instanceof EncryptionKey) {
            return value.bytes
        }

        if (value instanceof Uint8Array) {
            return value
        }

        return Codec.decodeBase64Url(value)
    }
}

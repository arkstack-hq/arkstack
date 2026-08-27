import type { CipherOptions, KeyInput } from './types'

import { Codec } from './support/codec'
import { EncryptionKey } from './EncryptionKey'
import { randomBytes, subtle } from './support/subtle'

const IV_LENGTH = 12

const TAG_LENGTH = 16

const PAYLOAD_PATTERN = /^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]*$/

/**
 * AES-256-GCM symmetric encryption built on the Web Crypto API.
 *
 * Payloads are colon delimited base64url triples — `<iv>:<authTag>:<ciphertext>`
 * — which is byte for byte the format Arkstack has always written. A value
 * encrypted by a Node server decrypts in the browser and vice versa, provided
 * both sides hold the same key.
 */
export class Cipher {
    /** Initialisation vector length in bytes. */
    static readonly ivLength = IV_LENGTH

    /** GCM authentication tag length in bytes. */
    static readonly tagLength = TAG_LENGTH

    /**
     * @param key The symmetric key this cipher operates with.
     */
    constructor(readonly key: EncryptionKey) { }

    /**
     * Build a cipher from any accepted key representation.
     *
     * @param key
     * @returns
     */
    static async from(key: KeyInput): Promise<Cipher> {
        return new Cipher(await EncryptionKey.resolve(key))
    }

    /**
     * Build a cipher backed by a freshly generated random key.
     *
     * @returns
     */
    static create(): Cipher {
        return new Cipher(EncryptionKey.generate())
    }

    /**
     * Encrypt a string.
     *
     * @param value
     * @param key
     * @param options
     * @returns
     */
    static async encrypt(value: string, key: KeyInput, options: CipherOptions = {}): Promise<string> {
        return await (await this.from(key)).encrypt(value, options)
    }

    /**
     * Decrypt a payload produced by {@link encrypt}.
     *
     * @param payload
     * @param key
     * @param options
     * @returns
     */
    static async decrypt(payload: string, key: KeyInput, options: CipherOptions = {}): Promise<string> {
        return await (await this.from(key)).decrypt(payload, options)
    }

    /**
     * Whether a string is shaped like a cipher payload. A cheap structural
     * check, not an authenticity check.
     *
     * @param value
     * @returns
     */
    static looksLikePayload(value: unknown): value is string {
        return typeof value === 'string' && PAYLOAD_PATTERN.test(value)
    }

    /**
     * Encrypt a UTF-8 string.
     *
     * @param value
     * @param options
     * @returns
     */
    async encrypt(value: string, options: CipherOptions = {}): Promise<string> {
        return await this.encryptBytes(Codec.encodeUtf8(value), options)
    }

    /**
     * Decrypt a payload back into a UTF-8 string.
     *
     * @param payload
     * @param options
     * @returns
     */
    async decrypt(payload: string, options: CipherOptions = {}): Promise<string> {
        return Codec.decodeUtf8(await this.decryptBytes(payload, options))
    }

    /**
     * Encrypt arbitrary bytes.
     *
     * @param bytes
     * @param options
     * @returns
     */
    async encryptBytes(bytes: Uint8Array, options: CipherOptions = {}): Promise<string> {
        const iv = randomBytes(IV_LENGTH)

        const sealed = new Uint8Array(await subtle().encrypt(
            this.parameters(iv, options),
            await this.cryptoKey(),
            bytes as unknown as BufferSource,
        ))

        // Web Crypto appends the authentication tag to the ciphertext; Arkstack
        // payloads carry it as its own segment, so split it back out here.
        const boundary = sealed.length - TAG_LENGTH

        return [
            iv,
            sealed.slice(boundary),
            sealed.slice(0, boundary),
        ].map((part) => Codec.encodeBase64Url(part)).join(':')
    }

    /**
     * Decrypt a payload back into raw bytes.
     *
     * @param payload
     * @param options
     * @returns
     */
    async decryptBytes(payload: string, options: CipherOptions = {}): Promise<Uint8Array> {
        const [iv, authTag, ciphertext] = payload.split(':')

        if (!iv || !authTag || ciphertext === undefined) {
            throw new Error('Invalid encrypted payload format')
        }

        const sealed = Codec.concat(
            Codec.decodeBase64Url(ciphertext),
            Codec.decodeBase64Url(authTag),
        )

        try {
            const plaintext = await subtle().decrypt(
                this.parameters(Codec.decodeBase64Url(iv), options),
                await this.cryptoKey(),
                sealed as unknown as BufferSource,
            )

            return new Uint8Array(plaintext)
        } catch {
            throw new Error('Unable to decrypt payload: the key is wrong or the ciphertext was tampered with')
        }
    }

    /**
     * Import the key once per cipher instance.
     *
     * @returns
     */
    private async cryptoKey(): Promise<CryptoKey> {
        this.imported ??= this.key.cryptoKey({ name: 'AES-GCM' }, ['encrypt', 'decrypt'])

        return await this.imported
    }

    /**
     * Build the AES-GCM parameters for a single operation.
     *
     * @param iv
     * @param options
     * @returns
     */
    private parameters(iv: Uint8Array, options: CipherOptions): AesGcmParams {
        const aad = typeof options.aad === 'string'
            ? Codec.encodeUtf8(options.aad)
            : options.aad

        return {
            name: 'AES-GCM',
            iv: iv as unknown as BufferSource,
            tagLength: TAG_LENGTH * 8,
            ...(aad ? { additionalData: aad as unknown as BufferSource } : {}),
        }
    }

    private imported?: Promise<CryptoKey>
}

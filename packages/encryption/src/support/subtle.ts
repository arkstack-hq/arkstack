/**
 * Resolve the ambient Web Crypto implementation.
 *
 * Node exposes it as `globalThis.crypto` from v19 (and behind
 * `node:crypto`'s `webcrypto` export from v15), browsers and workers expose it
 * on `window`/`self`. Secure contexts are required in browsers, hence the
 * explicit error message.
 *
 * @returns
 */
export const webCrypto = (): Crypto => {
    const candidate = (globalThis as { crypto?: Crypto }).crypto

    if (!candidate?.subtle) {
        throw new Error(
            'The Web Crypto API is unavailable. @arkstack/encryption requires Node 19+ '
            + '(or Node 18 with `globalThis.crypto` enabled) and a secure context (https or localhost) in browsers.',
        )
    }

    return candidate
}

/**
 * Resolve `crypto.subtle`.
 *
 * @returns
 */
export const subtle = (): SubtleCrypto => webCrypto().subtle

/**
 * Fill a buffer with cryptographically secure random bytes.
 *
 * @param length
 * @returns
 */
export const randomBytes = (length: number): Uint8Array => {
    if (!Number.isInteger(length) || length < 1) {
        throw new RangeError('Random byte length must be a positive integer')
    }

    return webCrypto().getRandomValues(new Uint8Array(length))
}

/**
 * SHA digest helper returning bytes instead of an `ArrayBuffer`.
 *
 * @param data
 * @param algorithm
 * @returns
 */
export const digest = async (
    data: Uint8Array,
    algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256',
): Promise<Uint8Array> => {
    return new Uint8Array(await subtle().digest(algorithm, data as unknown as BufferSource))
}

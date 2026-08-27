const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

const HEX_PATTERN = /^[0-9a-f]*$/i

/**
 * Runtime agnostic binary/text conversion helpers.
 *
 * Everything here is implemented against `Uint8Array`, `TextEncoder` and
 * `TextDecoder` so the exact same code path runs in Node, Deno, Bun, browsers
 * and workers. No `Buffer`, no `node:crypto`.
 */
export class Codec {
    private static readonly encoder = new TextEncoder()

    private static readonly decoder = new TextDecoder()

    /**
     * Encode a UTF-8 string to bytes.
     *
     * @param value
     * @returns
     */
    static encodeUtf8(value: string): Uint8Array {
        return this.encoder.encode(value)
    }

    /**
     * Decode bytes back to a UTF-8 string.
     *
     * @param bytes
     * @returns
     */
    static decodeUtf8(bytes: Uint8Array): string {
        return this.decoder.decode(bytes)
    }

    /**
     * Encode bytes as standard (padded) base64.
     *
     * @param bytes
     * @returns
     */
    static encodeBase64(bytes: Uint8Array): string {
        let binary = ''

        for (let index = 0; index < bytes.length; index += 1) {
            binary += String.fromCharCode(bytes[index]!)
        }

        if (typeof globalThis.btoa === 'function') {
            return globalThis.btoa(binary)
        }

        return this.fallbackEncodeBase64(bytes)
    }

    /**
     * Decode standard (padded or unpadded) base64 to bytes.
     *
     * @param value
     * @returns
     */
    static decodeBase64(value: string): Uint8Array {
        const normalized = value.replace(/\s+/g, '')

        if (typeof globalThis.atob === 'function') {
            const binary = globalThis.atob(this.pad(normalized))
            const bytes = new Uint8Array(binary.length)

            for (let index = 0; index < binary.length; index += 1) {
                bytes[index] = binary.charCodeAt(index)
            }

            return bytes
        }

        return this.fallbackDecodeBase64(this.pad(normalized))
    }

    /**
     * Encode bytes as unpadded base64url, the wire format used by every
     * Arkstack encryption payload.
     *
     * @param bytes
     * @returns
     */
    static encodeBase64Url(bytes: Uint8Array): string {
        return this.encodeBase64(bytes)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
    }

    /**
     * Decode a base64url string to bytes.
     *
     * @param value
     * @returns
     */
    static decodeBase64Url(value: string): Uint8Array {
        return this.decodeBase64(value.replace(/-/g, '+').replace(/_/g, '/'))
    }

    /**
     * Encode bytes as lowercase hex.
     *
     * @param bytes
     * @returns
     */
    static encodeHex(bytes: Uint8Array): string {
        let hex = ''

        for (let index = 0; index < bytes.length; index += 1) {
            hex += bytes[index]!.toString(16).padStart(2, '0')
        }

        return hex
    }

    /**
     * Decode a hex string to bytes.
     *
     * @param value
     * @returns
     */
    static decodeHex(value: string): Uint8Array {
        if (value.length % 2 !== 0 || !HEX_PATTERN.test(value)) {
            throw new TypeError('Invalid hex string')
        }

        const bytes = new Uint8Array(value.length / 2)

        for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16)
        }

        return bytes
    }

    /**
     * Concatenate byte sequences into a single buffer.
     *
     * @param parts
     * @returns
     */
    static concat(...parts: Uint8Array[]): Uint8Array {
        const total = parts.reduce((size, part) => size + part.length, 0)
        const output = new Uint8Array(total)

        let offset = 0

        for (const part of parts) {
            output.set(part, offset)
            offset += part.length
        }

        return output
    }

    /**
     * Compare two byte sequences without leaking their contents through timing.
     *
     * The length check is intentionally not constant time; key and digest
     * lengths are public information.
     *
     * @param left
     * @param right
     * @returns
     */
    static equals(left: Uint8Array, right: Uint8Array): boolean {
        if (left.length !== right.length) {
            return false
        }

        let difference = 0

        for (let index = 0; index < left.length; index += 1) {
            difference |= left[index]! ^ right[index]!
        }

        return difference === 0
    }

    /**
     * Normalize a `Uint8Array`, `ArrayBuffer` or `ArrayBufferView` to bytes.
     *
     * @param value
     * @returns
     */
    static toBytes(value: ArrayBuffer | ArrayBufferView): Uint8Array {
        if (value instanceof Uint8Array) {
            return value
        }

        if (ArrayBuffer.isView(value)) {
            return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
        }

        return new Uint8Array(value)
    }

    /**
     * Restore base64 padding stripped by the base64url encoding.
     *
     * @param value
     * @returns
     */
    private static pad(value: string): string {
        const remainder = value.length % 4

        return remainder === 0 ? value : value + '='.repeat(4 - remainder)
    }

    /**
     * Pure JS base64 encoder used when `btoa` is unavailable.
     *
     * @param bytes
     * @returns
     */
    private static fallbackEncodeBase64(bytes: Uint8Array): string {
        let output = ''

        for (let index = 0; index < bytes.length; index += 3) {
            const chunk = (bytes[index]! << 16)
                | ((bytes[index + 1] ?? 0) << 8)
                | (bytes[index + 2] ?? 0)

            const available = bytes.length - index

            output += BASE64_ALPHABET[(chunk >> 18) & 63]
            output += BASE64_ALPHABET[(chunk >> 12) & 63]
            output += available > 1 ? BASE64_ALPHABET[(chunk >> 6) & 63] : '='
            output += available > 2 ? BASE64_ALPHABET[chunk & 63] : '='
        }

        return output
    }

    /**
     * Pure JS base64 decoder used when `atob` is unavailable.
     *
     * @param value
     * @returns
     */
    private static fallbackDecodeBase64(value: string): Uint8Array {
        const clean = value.replace(/=+$/, '')
        const bytes = new Uint8Array((clean.length * 3) >> 2)

        let buffer = 0
        let bits = 0
        let offset = 0

        for (const character of clean) {
            const index = BASE64_ALPHABET.indexOf(character)

            if (index < 0) {
                throw new TypeError('Invalid base64 string')
            }

            buffer = (buffer << 6) | index
            bits += 6

            if (bits >= 8) {
                bits -= 8
                bytes[offset++] = (buffer >> bits) & 0xff
            }
        }

        return bytes
    }
}

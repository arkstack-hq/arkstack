import { describe, expect, it } from 'vitest'

import { Codec } from '../src'

describe('Codec', () => {
    it('round-trips utf8 through bytes', () => {
        const value = 'héllo wörld — 🔐'

        expect(Codec.decodeUtf8(Codec.encodeUtf8(value))).toBe(value)
    })

    it('round-trips every byte value through base64url', () => {
        const bytes = new Uint8Array(256).map((_, index) => index)
        const encoded = Codec.encodeBase64Url(bytes)

        expect(encoded).not.toMatch(/[+/=]/)
        expect(Codec.decodeBase64Url(encoded)).toEqual(bytes)
    })

    it('matches Buffer base64url encoding', () => {
        const bytes = new Uint8Array([0, 1, 250, 251, 252, 253, 254, 255])

        expect(Codec.encodeBase64Url(bytes)).toBe(Buffer.from(bytes).toString('base64url'))
        expect(Codec.decodeBase64Url('a-b_cd')).toEqual(new Uint8Array(Buffer.from('a-b_cd', 'base64url')))
    })

    it('round-trips hex', () => {
        const bytes = new Uint8Array([0, 15, 16, 255])

        expect(Codec.encodeHex(bytes)).toBe('000f10ff')
        expect(Codec.decodeHex('000f10ff')).toEqual(bytes)
        expect(() => Codec.decodeHex('abc')).toThrow(TypeError)
        expect(() => Codec.decodeHex('zz')).toThrow(TypeError)
    })

    it('concatenates byte sequences', () => {
        expect(Codec.concat(new Uint8Array([1, 2]), new Uint8Array([3]))).toEqual(new Uint8Array([1, 2, 3]))
    })

    it('compares byte sequences', () => {
        expect(Codec.equals(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true)
        expect(Codec.equals(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false)
        expect(Codec.equals(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2]))).toBe(false)
    })
})

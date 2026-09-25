import { afterEach, describe, expect, test } from 'vitest'

import { EnvLoader } from '../src/EnvLoader'

// Unique key per case so a real root .env can never collide with the fixtures.
const KEY = 'ARK_ENVLOADER_TEST'

afterEach(() => {
    delete process.env[KEY]
})

describe('EnvLoader', () => {
    test('coerces boolean-like values', () => {
        const loader = new EnvLoader()

        process.env[KEY] = 'true'
        expect(loader.get(KEY)).toBe(true)

        process.env[KEY] = 'off'
        expect(loader.get(KEY)).toBe(false)
    })

    test('coerces numeric strings to numbers', () => {
        const loader = new EnvLoader()

        process.env[KEY] = '6379'
        expect(loader.get(KEY)).toBe(6379)
    })

    test('treats the literal "null" as unset (falls back to the default)', () => {
        const loader = new EnvLoader()

        process.env[KEY] = 'null'
        expect(loader.get(KEY, 'fallback')).toBe('fallback')
    })

    test('returns the default when unset or empty', () => {
        const loader = new EnvLoader()

        expect(loader.get(KEY, 'fallback')).toBe('fallback')

        process.env[KEY] = ''
        expect(loader.get(KEY, 'fallback')).toBe('fallback')
    })

    test('returns plain strings untouched', () => {
        const loader = new EnvLoader()

        process.env[KEY] = 'localhost'
        expect(loader.get(KEY)).toBe('localhost')
    })

    /**
     * `Number()` accepts far more than decimal digits, and the values that
     * look like numbers by accident are often the ones where losing them
     * matters most. A number is only used when it says exactly what was
     * written.
     */
    describe('values that only look like numbers', () => {
        const keeps = (written: string) => {
            const loader = new EnvLoader()

            process.env[KEY] = written

            expect(loader.get(KEY)).toBe(written)
        }

        test('keeps a hexadecimal key, which a number would destroy', () => {
            // 32 bytes. As a number this keeps about its first thirteen digits.
            keeps(
                '0xd6d9ef6d3a5443f0de69a1452d0cb5a62bdd9700225c3c8371db575aa298408c',
            )
        })

        test('keeps a short hexadecimal value', () => {
            keeps('0x1f')
        })

        test('keeps binary and octal literals', () => {
            keeps('0b1010')
            keeps('0o755')
        })

        test('keeps leading zeros, which carry meaning of their own', () => {
            keeps('007')
        })

        test('keeps an integer wider than a double can hold', () => {
            keeps('12345678901234567890')
        })

        test('keeps exponent notation as it was written', () => {
            keeps('1e5')
        })

        test('keeps surrounding whitespace rather than trimming silently', () => {
            keeps(' 12 ')
        })

        test('keeps infinities out of configuration', () => {
            keeps('Infinity')
            keeps('-Infinity')
        })

        test('still reads an ordinary number as a number', () => {
            const loader = new EnvLoader()

            process.env[KEY] = '6379'
            expect(loader.get(KEY)).toBe(6379)

            process.env[KEY] = '-3'
            expect(loader.get(KEY)).toBe(-3)

            process.env[KEY] = '1.5'
            expect(loader.get(KEY)).toBe(1.5)

            process.env[KEY] = '0'
            expect(loader.get(KEY)).toBe(0)
        })
    })
})

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
})

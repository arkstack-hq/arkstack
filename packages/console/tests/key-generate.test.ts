import { describe, expect, test } from 'vitest'

import { KeyGenerateCommand } from '../src/commands/KeyGenerateCommand'

const hasEnvValue = KeyGenerateCommand.hasEnvValue
const upsertEnvKey = KeyGenerateCommand.upsertEnvKey

describe('hasEnvValue', () => {
    test('false when the line is absent', () => {
        expect(hasEnvValue('APP_NAME=X\n', 'APP_KEY')).toBe(false)
    })

    test('false for an empty assignment', () => {
        expect(hasEnvValue('APP_KEY=\n', 'APP_KEY')).toBe(false)
    })

    test('false for whitespace-only and empty quotes', () => {
        expect(hasEnvValue('APP_KEY=   \n', 'APP_KEY')).toBe(false)
        expect(hasEnvValue('APP_KEY=""\n', 'APP_KEY')).toBe(false)
        expect(hasEnvValue('APP_KEY=\'\'\n', 'APP_KEY')).toBe(false)
    })

    test('true for a real value (quoted or not)', () => {
        expect(hasEnvValue('APP_KEY=abc123\n', 'APP_KEY')).toBe(true)
        expect(hasEnvValue('APP_KEY="abc123"\n', 'APP_KEY')).toBe(true)
    })
})

describe('upsertEnvKey', () => {
    test('replaces an empty assignment in place', () => {
        expect(upsertEnvKey('APP_NAME=X\nAPP_KEY=\nDB=1\n', 'APP_KEY', 'NEW'))
            .toBe('APP_NAME=X\nAPP_KEY=NEW\nDB=1\n')
    })

    test('overwrites an existing value in place', () => {
        expect(upsertEnvKey('APP_KEY=old\nDB=1\n', 'APP_KEY', 'NEW'))
            .toBe('APP_KEY=NEW\nDB=1\n')
    })

    test('appends when absent', () => {
        expect(upsertEnvKey('APP_NAME=X\n', 'APP_KEY', 'NEW'))
            .toBe('APP_NAME=X\nAPP_KEY=NEW\n')
    })

    test('inserts values containing $ verbatim', () => {
        expect(upsertEnvKey('APP_KEY=old\n', 'APP_KEY', 'a$&b$1c'))
            .toBe('APP_KEY=a$&b$1c\n')
    })
})

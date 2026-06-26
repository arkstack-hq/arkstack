import { describe, expect, test } from 'vitest'

import { BuildInterfaces } from '../src/prepare/BuildInterfaces'

const ENV = [
    '# comment',
    '',
    'APP_NAME=Arkstack',
    'APP_PORT=3000',
    'MAIL_SECURE=false',
    'FEATURE_FLAG=on',
    'REDIS_HOST=127.0.0.1',
    'JWT_EXPIRES_IN=1h',
    'EMPTY=',
    'QUOTED="hello world"',
    'invalid line without equals',
].join('\n')

describe('BuildInterfaces.envRegistryFromEnv', () => {
    test('infers types from values and augments EnvRegistry', () => {
        const out = BuildInterfaces.envRegistryFromEnv(ENV)

        expect(out).toContain('declare module \'@arkstack/common\'')
        expect(out).toContain('interface EnvRegistry')
        expect(out).toContain('APP_NAME: string')
        expect(out).toContain('APP_PORT: number')
        expect(out).toContain('MAIL_SECURE: boolean')
        expect(out).toContain('FEATURE_FLAG: boolean')
        expect(out).toContain('REDIS_HOST: string') // 127.0.0.1 is not numeric
        expect(out).toContain('JWT_EXPIRES_IN: string')
        expect(out).toContain('EMPTY: string')
        expect(out).toContain('QUOTED: string')
        // The `export {}` module marker is added by env() when combining files,
        // not by the pure block, so two blocks never produce a duplicate.
        expect(out).not.toContain('export {}')
    })

    test('skips framework-owned (and any provided) keys', () => {
        const out = BuildInterfaces.envRegistryFromEnv(ENV, ['APP_NAME', 'APP_PORT'])

        expect(out).not.toContain('APP_NAME:')
        expect(out).not.toContain('APP_PORT:')
        expect(out).toContain('FEATURE_FLAG: boolean')
    })

    test('returns an empty string when nothing is left to emit', () => {
        expect(BuildInterfaces.envRegistryFromEnv('# only comments\n')).toBe('')
        expect(BuildInterfaces.envRegistryFromEnv('APP_NAME=x', ['APP_NAME'])).toBe('')
    })
})

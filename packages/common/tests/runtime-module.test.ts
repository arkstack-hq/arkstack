import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'

import { Arkstack } from '@arkstack/contract'
import { join } from 'node:path'
import { resolveRuntimeDir, resolveRuntimeModule, toOutputPath } from '../src/system'
import { tmpdir } from 'node:os'

let root: string
const originalEnv = process.env.NODE_ENV
const originalRootDir = Arkstack.rootDir

const touch = (file: string) => {
    mkdirSync(join(root, file, '..'), { recursive: true })
    writeFileSync(join(root, file), '')
}

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'ark-runtime-'))
    // Pin the app root so resolution is deterministic.
    ;(Arkstack as any).rootDir = () => root
})

afterEach(() => {
    ;(Arkstack as any).rootDir = originalRootDir
    if (originalEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalEnv
    rmSync(root, { recursive: true, force: true })
})

describe('resolveRuntimeModule', () => {
    test('development resolves the TypeScript source', () => {
        process.env.NODE_ENV = 'development'
        touch('src/app/models/User.ts')

        expect(resolveRuntimeModule('src/app/models/User'))
            .toBe(join(root, 'src/app/models/User.ts'))
    })

    test('production resolves the compiled output, stripping the src segment', () => {
        process.env.NODE_ENV = 'production'
        touch('dist/app/models/User.js')

        expect(resolveRuntimeModule('src/app/models/User'))
            .toBe(join(root, 'dist/app/models/User.js'))
    })

    test('production maps a .ts route path to the compiled .js under dist', () => {
        process.env.NODE_ENV = 'production'
        touch('dist/routes/api.js')

        expect(resolveRuntimeModule('src/routes/api.ts'))
            .toBe(join(root, 'dist/routes/api.js'))
    })

    test('production prefers dist even when source is also present', () => {
        process.env.NODE_ENV = 'production'
        touch('src/routes/api.ts')
        touch('dist/routes/api.js')

        expect(resolveRuntimeModule('src/routes/api.ts'))
            .toBe(join(root, 'dist/routes/api.js'))
    })

    test('returns the source path unchanged when nothing exists', () => {
        process.env.NODE_ENV = 'production'

        expect(resolveRuntimeModule('src/app/models/Missing'))
            .toBe(join(root, 'src/app/models/Missing'))
    })
})

describe('resolveRuntimeDir', () => {
    const mkdir = (dir: string) => mkdirSync(join(root, dir), { recursive: true })

    test('development resolves the source directory', () => {
        process.env.NODE_ENV = 'development'
        mkdir('src/routes')

        expect(resolveRuntimeDir('src/routes')).toBe(join(root, 'src/routes'))
    })

    test('production resolves the output directory, stripping the src segment', () => {
        process.env.NODE_ENV = 'production'
        mkdir('dist/routes')

        expect(resolveRuntimeDir('src/routes')).toBe(join(root, 'dist/routes'))
    })

    test('production prefers the output directory even when source is present', () => {
        process.env.NODE_ENV = 'production'
        mkdir('src/routes')
        mkdir('dist/routes')

        expect(resolveRuntimeDir('src/routes')).toBe(join(root, 'dist/routes'))
    })

    test('returns the absolute source dir when neither exists', () => {
        process.env.NODE_ENV = 'production'

        expect(resolveRuntimeDir('src/routes')).toBe(join(root, 'src/routes'))
    })
})

describe('toOutputPath', () => {
    test('maps a TypeScript source to the compiled .js under the output dir', () => {
        process.env.NODE_ENV = 'production'

        expect(toOutputPath('src/app/models/User.ts'))
            .toBe(join(root, 'dist/app/models/User.js'))
    })

    test('strips the src segment for a directory, leaving the extension alone', () => {
        process.env.NODE_ENV = 'production'

        expect(toOutputPath('src/routes')).toBe(join(root, 'dist/routes'))
    })

    test('leaves an existing .js extension as-is', () => {
        process.env.NODE_ENV = 'production'

        expect(toOutputPath('src/app/models/User.js'))
            .toBe(join(root, 'dist/app/models/User.js'))
    })

    test('does not consult the filesystem (pure transform)', () => {
        process.env.NODE_ENV = 'production'

        // Nothing is created on disk; the mapping is purely structural.
        expect(toOutputPath('src/whatever/Missing.ts'))
            .toBe(join(root, 'dist/whatever/Missing.js'))
    })
})

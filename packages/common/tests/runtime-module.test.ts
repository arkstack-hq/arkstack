import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'

import { Arkstack } from '@arkstack/contract'
import { join } from 'node:path'
import { resolveRuntimeModule } from '../src/system'
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

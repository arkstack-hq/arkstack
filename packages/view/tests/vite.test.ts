import { ViewFactory, viteReactRefresh, viteTags } from '../src'
import { afterEach, describe, expect, test } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'

import { join } from 'node:path'
import { tmpdir } from 'node:os'

const tmpDirs: string[] = []

const writeManifest = (manifest: Record<string, unknown>): string => {
    const dir = mkdtempSync(join(tmpdir(), 'ark-vite-'))
    tmpDirs.push(dir)
    const path = join(dir, 'manifest.json')
    writeFileSync(path, JSON.stringify(manifest))

    return path
}

afterEach(() => {
    while (tmpDirs.length) {
        rmSync(tmpDirs.pop()!, { recursive: true, force: true })
    }
})

describe('viteTags (development)', () => {
    test('emits the dev client and module scripts', () => {
        const html = viteTags('resources/js/app.ts', { hot: true })

        expect(html).toContain('<script type="module" src="http://localhost:5173/@vite/client"></script>')
        expect(html).toContain('<script type="module" src="http://localhost:5173/resources/js/app.ts"></script>')
    })

    test('honours a custom dev URL and multiple entries', () => {
        const html = viteTags(['resources/css/app.css', 'resources/js/app.ts'], {
            hot: true,
            devUrl: 'http://127.0.0.1:3001/',
        })

        expect(html).toContain('http://127.0.0.1:3001/@vite/client')
        expect(html).toContain('http://127.0.0.1:3001/resources/css/app.css')
        expect(html).toContain('http://127.0.0.1:3001/resources/js/app.ts')
    })
})

describe('viteTags (production)', () => {
    test('resolves hashed assets and imported css from the manifest', () => {
        const manifest = writeManifest({
            'resources/js/app.ts': { file: 'assets/app-abc123.js', css: ['assets/app-def456.css'] },
            'resources/css/app.css': { file: 'assets/style-xyz789.css' },
        })

        const html = viteTags(['resources/css/app.css', 'resources/js/app.ts'], {
            hot: false,
            manifest,
            buildDir: '/build/',
        })

        expect(html).toContain('<link rel="stylesheet" href="/build/assets/style-xyz789.css">')
        expect(html).toContain('<link rel="stylesheet" href="/build/assets/app-def456.css">')
        expect(html).toContain('<script type="module" src="/build/assets/app-abc123.js"></script>')
        expect(html).not.toContain('@vite/client')
    })

    test('throws when the manifest is missing', () => {
        expect(() => viteTags('app.ts', { hot: false, manifest: '/no/such/manifest.json' }))
            .toThrow(/manifest not found/i)
    })

    test('throws when an entry is absent from the manifest', () => {
        const manifest = writeManifest({ 'resources/js/app.ts': { file: 'assets/app.js' } })

        expect(() => viteTags('resources/js/missing.ts', { hot: false, manifest }))
            .toThrow(/no entry for/i)
    })
})

describe('viteReactRefresh', () => {
    test('emits the React Refresh preamble in development', () => {
        const html = viteReactRefresh({ hot: true })

        expect(html).toContain('import RefreshRuntime from \'http://localhost:5173/@react-refresh\'')
        expect(html).toContain('window.__vite_plugin_react_preamble_installed__ = true')
    })

    test('honours a custom dev URL', () => {
        const html = viteReactRefresh({ hot: true, devUrl: 'http://127.0.0.1:3001/' })

        expect(html).toContain('import RefreshRuntime from \'http://127.0.0.1:3001/@react-refresh\'')
    })

    test('emits nothing in production', () => {
        expect(viteReactRefresh({ hot: false })).toBe('')
    })
})

describe('@vite tag', () => {
    test('renders dev tags through the Edge tag', async () => {
        const factory = new ViewFactory()
        factory.raw('with-vite', '@vite("resources/js/app.ts")')

        const html = await factory.make('with-vite').render()

        expect(html).toContain('http://localhost:5173/@vite/client')
        expect(html).toContain('http://localhost:5173/resources/js/app.ts')
    })

    test('renders the React Refresh preamble through the @viteReactRefresh tag', async () => {
        const factory = new ViewFactory()
        factory.raw('with-refresh', '@viteReactRefresh')

        const html = await factory.make('with-refresh').render()

        expect(html).toContain('import RefreshRuntime from \'http://localhost:5173/@react-refresh\'')
        expect(html).toContain('window.__vite_plugin_react_preamble_installed__ = true')
    })
})

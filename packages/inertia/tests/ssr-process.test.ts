import { describe, expect, test } from 'vitest'

import { DEFAULT_SSR_BUNDLE, resolveSsrBundle } from '../src/ssr-process'

describe('resolveSsrBundle', () => {
    const root = '/app'

    test('defaults to dist-ssr/ssr.js under the app root', () => {
        expect(resolveSsrBundle(root)).toBe('/app/dist-ssr/ssr.js')
        expect(DEFAULT_SSR_BUNDLE).toBe('dist-ssr/ssr.js')
    })

    test('uses the configured bundle when no option is given', () => {
        expect(resolveSsrBundle(root, undefined, 'build/ssr.js')).toBe('/app/build/ssr.js')
    })

    test('the option takes precedence over config', () => {
        expect(resolveSsrBundle(root, 'opt/ssr.js', 'cfg/ssr.js')).toBe('/app/opt/ssr.js')
    })

    test('absolute paths are kept as-is', () => {
        expect(resolveSsrBundle(root, '/abs/ssr.js')).toBe('/abs/ssr.js')
        expect(resolveSsrBundle(root, undefined, '/abs/cfg.js')).toBe('/abs/cfg.js')
    })
})

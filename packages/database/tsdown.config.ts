import { baseConfig } from '../../tsdown.config'
import { defineConfig } from 'tsdown'

export default defineConfig([
    {
        ...baseConfig,
        entry: ['src/index.ts', 'src/setup.ts'],
        format: 'esm',
        shims: false,
        outDir: 'dist',
    }, {
        ...baseConfig,
        entry: ['src/commands/*.ts'],
        format: 'esm',
        shims: false,
        dts: false,
        outDir: 'dist/commands',
        // Keep shared chunks (e.g. the Rebuilder used by several make:* commands)
        // out of dist/commands itself: the console kernel discovers commands via a
        // non-recursive `dist/commands/*.js` glob and would otherwise try to load a
        // bundler chunk as if it were a Command (it has no getSignature()).
        outputOptions: {
            chunkFileNames: 'chunks/[name]-[hash].js',
        },
    }
])

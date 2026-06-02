import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config'

export default defineConfig({
    ...baseConfig,
    entry: ['src/index.ts'],
    format: 'esm',
    sourcemap: false,
    shims: false,
    outDir: 'dist',
})

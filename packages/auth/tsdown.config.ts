import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config'

export default defineConfig({
    ...baseConfig,
    entry: ['src/index.ts'],
    format: 'esm',
    shims: false,
    outDir: 'dist',
})

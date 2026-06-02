import { baseConfig } from '../../tsdown.config'
import { defineConfig } from 'tsdown'

export default defineConfig({
    ...baseConfig,
    entry: ['src/index.ts'],
    format: 'esm',
    sourcemap: false,
    outDir: 'dist',
})

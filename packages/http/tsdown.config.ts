import { baseConfig } from '../../tsdown.config'
import { defineConfig } from 'tsdown'

export default defineConfig({
    ...baseConfig,
    entry: ['src/index.ts', 'src/setup.ts'],
    format: 'esm',
    sourcemap: true,
    shims: false,
    outDir: 'dist',
})

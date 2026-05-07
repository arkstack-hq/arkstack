import { baseConfig } from '../../tsdown.config'
import { defineConfig } from 'tsdown'

export default defineConfig({
    ...baseConfig,
    entry: ['src/index.ts'],
    format: 'esm',
    sourcemap: true,
    outDir: 'dist',
    copy: [{ from: 'src/resources', to: 'src/../' }]
})

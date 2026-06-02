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
    }
])

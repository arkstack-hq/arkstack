import config from '../../tsdown.config'
import { defineConfig } from 'tsdown'

export default defineConfig({
    ...config,
    entry: ['src/index.ts'],
    format: 'esm',
    dts: true,
    clean: true,
    outDir: 'dist',
    outExtensions() {
        return {
            'js': '.js',
            'd.ts': '.ts',
        }
    }
})

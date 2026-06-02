import config from '../../tsdown.config'
import { defineConfig } from 'tsdown'

export default defineConfig({
    ...config,
    entry: ['src/index.ts'],
    format: 'esm',
    sourcemap: false,
    dts: true,
    clean: true,
    outDir: 'dist',
    outExtensions (ctx) {
        return {
            'js': ctx.format === 'cjs' ? '.cjs' : '.js',
            'd.ts': '.ts',
        }
    }
})

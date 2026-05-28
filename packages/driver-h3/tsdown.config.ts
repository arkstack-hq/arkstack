import config from '../../tsdown.config'
import { defineConfig } from 'tsdown'

export default defineConfig({
    hooks: config.hooks,
    entry: ['src/index.ts', 'src/middlewares/index.ts', 'src/types.ts'],
    exports: true,
    format: 'esm',
    sourcemap: true,
    dts: true,
    clean: true,
    outDir: 'dist',
    deps: {
        skipNodeModulesBundle: true,
    },
    outExtensions (ctx) {
        return {
            'js': ctx.format === 'cjs' ? '.cjs' : '.js',
            'd.ts': '.ts',
        }
    }
})

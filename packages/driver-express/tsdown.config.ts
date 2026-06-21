import config from '../../tsdown.config'
import { defineConfig } from 'tsdown'

export default defineConfig({
    hooks: config.hooks,
    entry: ['src/index.ts', 'src/middlewares/index.ts', 'src/types.ts'],
    exports: true,
    format: 'esm',
    dts: true,
    clean: true,
    outDir: 'dist',
    deps: {
        skipNodeModulesBundle: true,
        neverBundle: [
            /^@h3ravel\/.*/gi,
            /^@arkstack\/.*/gi,
        ]
    },
    outExtensions (ctx) {
        return {
            'js': ctx.format === 'cjs' ? '.cjs' : '.js',
            'd.ts': '.ts',
        }
    }
})

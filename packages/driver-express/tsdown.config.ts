import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: ['src/index.ts', 'src/middlewares/index.ts'],
    sourcemap: true,
    exports: true,
    format: 'esm',
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

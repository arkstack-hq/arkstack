import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: ['src/index.ts', 'src/commands/StorageLinkCommand.ts'],
    exports: true,
    format: 'esm',
    sourcemap: true,
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

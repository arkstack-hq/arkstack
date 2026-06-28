import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: ['src/index.ts', 'src/setup.ts', 'src/commands/CacheClearCommand.ts'],
    exports: true,
    format: 'esm',
    sourcemap: false,
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

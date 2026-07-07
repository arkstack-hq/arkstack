import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: ['src/index.ts', 'src/react/index.ts', 'src/vue/index.ts'],
    format: 'esm',
    dts: true,
    clean: true,
    sourcemap: false,
    outDir: 'dist',
    outExtensions() {
        return {
            js: '.js',
            dts: '.d.ts',
        }
    },
    deps: {
        skipNodeModulesBundle: true,
    },
})

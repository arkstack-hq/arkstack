import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: ['src/run.ts'],
    format: 'esm',
    outDir: 'bin',
    dts: false,
    minify: true,
    exports: true,
    sourcemap: false,
    deps: {
        neverBundle: [
            'fs',
            'path',
            'os',
            'dotenv'
        ]
    },
    clean: true,
    outExtensions: () => {
        return ({
            js: '.js',
            dts: '.d.ts'
        })
    },
}) 

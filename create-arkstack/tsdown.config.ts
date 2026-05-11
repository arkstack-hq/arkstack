import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: ['src/run.ts'],
    format: 'esm',
    outDir: 'bin',
    dts: false,
    sourcemap: false,
    deps: {
        neverBundle: [
            'fs',
            'path',
            'os',
            'dotenv'
        ]
    },
    clean: true
}) 

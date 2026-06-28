import { readFileSync, writeFileSync } from 'node:fs'

import { defineConfig } from 'tsdown'
import path from 'node:path'

const safeRegions = [
    'TSConfig.ts'
]

export default defineConfig({
    entry: ['src/index.ts', 'src/app.ts', 'src/prepare.ts'],
    format: 'esm',
    sourcemap: false,
    minify: false,
    dts: true,
    clean: true,
    outDir: 'dist',
    outExtensions() {
        return {
            'js': '.js',
            'd.ts': '.ts',
        }
    },
    hooks(e) {
        e.hook('build:done', async (e) => {
            for (let i = 0; i < e.chunks.length; i++) {
                const chunk = e.chunks[i]
                if (chunk.fileName.endsWith('.js')) {
                    let code = readFileSync(path.join(chunk.outDir, chunk.fileName), 'utf-8')
                    if (safeRegions.some(e => code.includes(e))) continue
                    code = code.replace(/src\//g, 'dist/').replace(/(?<!\.d)\.ts(?=\b|$)/g, '.js')
                    writeFileSync(path.join(chunk.outDir, chunk.fileName), code, 'utf-8')
                }
            }
        })
    },
})

import { readFileSync, writeFileSync } from 'node:fs'

import { defineConfig } from 'tsdown'
import path from 'node:path'
import run from '@rollup/plugin-run'

const env = process.env.NODE_ENV || 'development'

export default defineConfig([
  {
    unbundle: true,
    tsconfig: 'tsconfig.json',
    entry: ['src/**/*.ts'],
    platform: 'node',
    outDir: 'dist',
    format: 'esm',
    sourcemap: true,
    logLevel: 'silent',
    watch: env === 'development' ? ['.env', '.env.*', 'src', 'tsconfig.json'] : false,
    plugins:
      env === 'development' && process.env.CLI_BUILD !== 'true'
        ? [
          run({
            env: Object.assign({}, process.env, {
              NODE_ENV: env,
            }),
            execArgv: ['-r', 'source-map-support/register', '-r', 'tsconfig-paths/register'],
            allowRestarts: false,
            input: process.cwd() + '/src/server.ts',
          }),
        ]
        : [],
    outExtensions: (e) => {
      return {
        js: e.format === 'es' ? '.js' : '.cjs',
        dts: '.d.ts',
      }
    },
    skipNodeModulesBundle: true,
    hooks (e) {
      e.hook('build:done', async (e) => {
        for (let i = 0; i < e.chunks.length; i++) {
          const chunk = e.chunks[i]
          if (chunk.fileName.endsWith('.js')) {
            let code = readFileSync(path.join(chunk.outDir, chunk.fileName), 'utf-8')
            code = code.replace(/src\//g, 'dist/').replace(/\.ts/g, '.js')
            writeFileSync(path.join(chunk.outDir, chunk.fileName), code, 'utf-8')
          }
        }
      })
    },
  },
])

import { nodeEnv, outputDir } from '@arkstack/common'
import { readFileSync, writeFileSync } from 'node:fs'

import { defineConfig } from 'tsdown'
import path from 'node:path'
import run from '@rollup/plugin-run'

const env = nodeEnv()
const dist = path.relative(process.cwd(), outputDir())

export default defineConfig([
  {
    unbundle: true,
    tsconfig: 'tsconfig.json',
    entry: ['src/**/*.ts'],
    platform: 'node',
    outDir: dist,
    format: 'esm',
    sourcemap: true,
    logLevel: 'silent',
    deps: {
      skipNodeModulesBundle: true,
    },
    watch: env === 'dev' && process.env.CLI_BUILD !== 'true' ? ['.env', '.env.*', 'src', 'tsconfig.json'] : false,
    plugins:
      env === 'dev' && process.env.CLI_BUILD !== 'true'
        ? [
          run({
            env: Object.assign({}, process.env, {
              NODE_ENV: env,
            }),
            execArgv: ['-r', 'source-map-support/register'],
            allowRestarts: true,
            input: path.join(process.cwd(), 'src/server.ts'),
          }),
        ]
        : [],
    outExtensions: (e) => {
      return {
        js: e.format === 'es' ? '.js' : '.cjs',
        dts: '.d.ts',
      }
    },
    hooks (e) {
      e.hook('build:done', async (e) => {
        for (let i = 0; i < e.chunks.length; i++) {
          const chunk = e.chunks[i]
          if (chunk.fileName.endsWith('.js')) {
            let code = readFileSync(path.join(chunk.outDir, chunk.fileName), 'utf-8')
            code = code.replace(/src\//g, `${dist}/`).replace(/\.ts/g, '.js')
            writeFileSync(path.join(chunk.outDir, chunk.fileName), code, 'utf-8')
          }
        }
      })
    },
  },
])

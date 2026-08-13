import { devServer, nodeEnv, outputDir } from '@arkstack/common'
import { readFileSync, writeFileSync } from 'node:fs'

import { Arkstack } from '@arkstack/contract'
import { defineConfig } from 'tsdown'
import path from 'node:path'

const env = nodeEnv()
const dist = path.relative(Arkstack.rootDir(), outputDir())

export default defineConfig([
  {
    unbundle: true,
    // Wipe the output dir on build/prepare so a renamed/removed/added source file
    // can't leave a stale emitted module behind (which would wedge the next boot).
    // Skipped for the live dev watcher so its running server isn't disrupted.
    clean: env !== 'dev' || process.env.CLI_BUILD === 'true',
    tsconfig: 'tsconfig.json',
    entry: ['src/**/*.ts'],
    platform: 'node',
    outDir: dist,
    format: 'esm',
    sourcemap: env !== 'dev',
    logLevel: 'silent',
    deps: {
      skipNodeModulesBundle: true,
    },
    watch: env === 'dev' && process.env.CLI_BUILD !== 'true' ? ['.env', '.env.*', 'src', 'tsconfig.json'] : false,
    plugins: [
      devServer({
        env: Object.assign({}, process.env, {
          NODE_ENV: env,
        }),
        execArgv: ['-r', 'source-map-support/register'],
        input: path.join(Arkstack.rootDir(), 'src/server.ts'),
      }),
    ],
    outExtensions: () => {
      return {
        js: '.js',
        dts: '.d.ts',
      }
    },
    hooks(e) {
      e.hook('build:done', async (e) => {
        for (let i = 0; i < e.chunks.length; i++) {
          const chunk = e.chunks[i]
          if (chunk && chunk.fileName.endsWith('.js')) {
            let code = readFileSync(path.join(chunk.outDir, chunk.fileName), 'utf-8')
            // Remap module specifiers from source (`src/…`, `.ts`) to their built
            // location (`${dist}/…`, `.js`). Scoped to import/export/require
            // specifiers so unrelated string data and comments are never rewritten.
            code = code.replace(
              /(?<![\w.])(from|import|require)(\s*\(?\s*)(["'])([^"'\n]+)\3/g,
              (_m, kw, gap, quote, spec) =>
                `${kw}${gap}${quote}${spec.replace(/^src\//, `${dist}/`).replace(/(?<!\.d)\.ts$/, '.js')}${quote}`,
            )
            writeFileSync(path.join(chunk.outDir, chunk.fileName), code, 'utf-8')
          }
        }
      })
    },
  },
])

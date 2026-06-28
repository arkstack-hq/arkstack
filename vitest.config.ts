import { ViteUserConfig, defineConfig } from 'vitest/config'

import path from 'node:path'
import { pathToFileURL } from 'node:url'
import swc from 'unplugin-swc'

export default defineConfig({

    plugins: [
        swc.vite({
            jsc: {
                parser: {
                    syntax: 'typescript',
                    decorators: true,
                },
                transform: {
                    decoratorMetadata: true,
                    legacyDecorator: true,
                },
                target: 'es2021',
            },
        }) as never,
    ],
    resolve: {
        alias: [
            {
                find: /^@arkstack\/([^/]+)\/(.+)$/,
                replacement: path.resolve(__dirname, 'packages') + '/$1/src/$2',
            },
            {
                find: /^@arkstack\/([^/]+)$/,
                replacement: path.resolve(__dirname, 'packages') + '/$1/src/index.ts',
            },
            {
                find: /^@app\/models\/([^/]+)$/,
                replacement: '$1',
                customResolver(source, importer) {
                    const pkgRoot = (importer ?? '').split('/src/').at(0)!

                    return path.resolve(pkgRoot, 'src/Contracts', `${source}.ts`)
                },
            },
        ],
        tsconfigPaths: true,
    } as ViteUserConfig['resolve'],
    test: {
        // setup file is at the root of the project, so we need to resolve it not from the current package, but from the root
        setupFiles: [
            path.resolve(__dirname, 'tests/setup.ts'),
            pathToFileURL('testsSetup.ts').href
        ],
        root: './',
        passWithNoTests: true,
        environment: 'node',
        include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
        env: {
            NODE_ENV: 'test',
            VERBOSITY: '0'
        },
        coverage: {
            reporter: ['text', 'json', 'html', 'lcov'],
            reportsDirectory: 'coverage',
            exclude: ['**/node_modules/**', '**/dist/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**', '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*', '**/.arkstack/**'],
        }
    }
})

import { Plugin, configDefaults, defineConfig } from 'vitest/config'

import path from 'node:path'
import { pathToFileURL } from 'node:url'

function appModelsResolver(): Plugin {
    const modelPattern = /^@app\/models\/([^/]+)$/

    return {
        name: 'resolve-app-models',
        enforce: 'pre',

        resolveId(source, importer) {
            const match = source.match(modelPattern)

            if (!match) {
                return null
            }

            const [, model] = match
            const pkgRoot = (importer ?? '').split('/src/').at(0)!

            return path.resolve(
                pkgRoot,
                'src/Contracts',
                `${model}.ts`,
            )
        },
    }
}

export default defineConfig({
    plugins: [appModelsResolver()],
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
        ],
        tsconfigPaths: true,
    },
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
        exclude: [...configDefaults.exclude, 'templates/**'],
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

import { defineConfig } from 'vitest/config'
import path from 'node:path'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        // setup file is at the root of the project, so we need to resolve it not from the current package, but from the root
        setupFiles: path.resolve(__dirname, 'tests/setup.ts'),
        root: './',
        passWithNoTests: true,
        environment: 'node',
        include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
        env: {
            NODE_ENV: 'test',
        },
        coverage: {
            reporter: ['text', 'json', 'html', 'lcov'],
            reportsDirectory: 'coverage',
            exclude: ['**/node_modules/**', '**/dist/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**', '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*', '**/.arkstack/**'],
        }
    }
})
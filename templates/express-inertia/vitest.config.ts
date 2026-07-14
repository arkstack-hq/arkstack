import { defineConfig } from 'vitest/config'

export default defineConfig({
    oxc: {
        decorator: {
            legacy: true,
            emitDecoratorMetadata: true,
        }
    },
    resolve: {
        tsconfigPaths: true
    },
    test: {
        environment: 'node',
        include: ['tests/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
        env: {
            NODE_ENV: 'test',
            VERBOSITY: '0'
        },
    },
})

import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
    resolve: {
        alias: {
            '@': resolvePath('./src'),
            'src': resolvePath('./src'),
            '@app': resolvePath('./src/app'),
            '@core': resolvePath('./src/core'),
            '@controllers': resolvePath('./src/app/http/controllers'),
            '@models': resolvePath('./src/app/models'),
        },
    },
    test: {
        environment: 'node',
        include: ['tests/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
        env: {
            NODE_ENV: 'test',
        },
    },
})

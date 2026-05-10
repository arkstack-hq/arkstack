import { URL, fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'
import swc from 'unplugin-swc'

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url))

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

import { baseConfig } from '../../tsdown.config'
import { defineConfig } from 'tsdown'

export default defineConfig({
    ...baseConfig,
    entry: ['src/index.ts', 'src/utils/index.ts', 'src/faker.ts'],
    format: 'esm',
    outDir: 'dist',
    copy: [{ from: 'src/resources', to: 'src/../' }],
    exports: true,
    deps: {
        neverBundle: [
            /^@faker-js\/.*/gi,
            /^@pictwo\/.*/gi,
        ]
    }
})

import { dirname, join } from 'node:path'

import { Publisher } from '@arkstack/common'
import { fileURLToPath } from 'node:url'

// `stubs/` ships alongside `dist/` and `src/` (one level up from this module in
// both the built and source layouts).
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Register the artifacts `@arkstack/inertia` publishes into the application.
 *
 * Run `ark publish --package @arkstack/inertia` to copy the Inertia config and
 * the root Edge template into the app, then customize them for your front-end
 * (Vite tags, title, meta, etc.).
 */
Publisher.publishes({
    package: '@arkstack/inertia',
    tag: 'inertia-config',
    entries: [
        {
            from: join(root, 'stubs/config/inertia.ts.stub'),
            to: 'src/config/inertia.ts',
        },
    ],
})

Publisher.publishes({
    package: '@arkstack/inertia',
    tag: 'inertia-views',
    entries: [
        {
            from: join(root, 'stubs/views/app.edge.stub'),
            to: 'src/resources/views/app.edge',
        },
    ],
})

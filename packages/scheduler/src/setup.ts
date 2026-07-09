import { dirname, join } from 'node:path'

import { Publisher } from '@arkstack/common'
import { fileURLToPath } from 'node:url'

// `stubs/` ships alongside `dist/` and `src/` (one level up from this module in
// both the built and source layouts).
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Register the artifacts `@arkstack/scheduler` publishes into the application.
 *
 * Run `ark publish --package @arkstack/scheduler` to copy the starter
 * `src/routes/console.ts` schedule file into the app.
 */
Publisher.publishes({
    package: '@arkstack/scheduler',
    tag: 'scheduler-routes',
    entries: [
        {
            from: join(root, 'stubs/routes/console.ts.stub'),
            to: 'src/routes/console.ts',
        },
    ],
})

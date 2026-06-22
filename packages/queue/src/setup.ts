import { dirname, join } from 'node:path'

import { Publisher } from '@arkstack/common'
import { fileURLToPath } from 'node:url'

// `stubs/` ships alongside `dist/` and `src/` (one level up from this module in
// both the built and source layouts).
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Register the artifacts `@arkstack/queue` publishes into the application.
 *
 * Run `ark publish --package @arkstack/queue` (or `--tag queue-migrations`) to
 * copy the migration for the `database` queue connection into the app.
 */
Publisher.publishes({
    package: '@arkstack/queue',
    tag: 'queue-migrations',
    entries: [
        {
            from: join(root, 'stubs/migrations/20260601000001_create_jobs_table.ts.stub'),
            to: 'src/database/migrations/20260601000001_create_jobs_table.ts',
        },
    ],
})

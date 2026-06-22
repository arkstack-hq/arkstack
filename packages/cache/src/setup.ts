import { dirname, join } from 'node:path'

import { Publisher } from '@arkstack/common'
import { fileURLToPath } from 'node:url'

// `stubs/` ships alongside `dist/` and `src/` (one level up from this module in
// both the built and source layouts).
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Register the artifacts `@arkstack/cache` publishes into the application.
 *
 * Run `ark publish --package @arkstack/cache` (or `--tag cache-migrations`) to
 * copy the migration for the `database` cache store into the app.
 */
Publisher.publishes({
    package: '@arkstack/cache',
    tag: 'cache-migrations',
    entries: [
        {
            from: join(root, 'stubs/migrations/20260601000000_create_cache_table.ts.stub'),
            to: 'src/database/migrations/20260601000000_create_cache_table.ts',
        },
    ],
})

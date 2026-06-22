import { dirname, join } from 'node:path'

import { Publisher } from '@arkstack/common'
import { fileURLToPath } from 'node:url'

// `stubs/` ships alongside `dist/` and `src/` (one level up from this module in
// both the built and source layouts).
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Register the artifacts `@arkstack/auth` publishes into the application.
 *
 * Run `ark publish --tag two-factor` (or `--package @arkstack/auth`) to copy the
 * `UserTwoFactor` model and the migration that creates the `user_two_factors`
 * table into the app.
 */
Publisher.publishes({
    package: '@arkstack/auth',
    tag: 'two-factor',
    entries: [
        {
            from: join(root, 'stubs/models/UserTwoFactor.ts.stub'),
            to: 'src/app/models/UserTwoFactor.ts',
        },
        {
            from: join(root, 'stubs/migrations/20260505110000_create_user_two_factors_table.ts.stub'),
            to: 'src/database/migrations/20260505110000_create_user_two_factors_table.ts',
        },
    ],
})

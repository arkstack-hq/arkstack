import 'dotenv/config'

import { dirname, join } from 'node:path'

import { CoreRouter } from 'clear-router/core'
import { Publisher } from '@arkstack/common'
import { Validator } from 'kanun'
import { ValidatorDBDriver } from './ValidatorDBDriver'
import { bootArkorm } from './arkorm'
import { clearRouterPlugin } from '@arkormx/plugin-clear-router'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

CoreRouter.use(clearRouterPlugin)
Validator.useDatabase(new ValidatorDBDriver())

/**
 * Configure ArkORM from `src/config/database.ts` so the application works
 * without an `arkormx.config.ts`. A user-provided config file still takes
 * precedence, and an unconfigured database (e.g. some CLI contexts) is ignored.
 */
try {
    bootArkorm()
} catch {
    /** Database not configured in this context. */
}

Publisher.publishes({
    package: '@arkstack/database',
    tag: 'database-config',
    entries: [
        {
            from: join(root, 'stubs/config/database.ts.stub'),
            to: 'src/config/database.ts',
        },
    ],
})
import 'dotenv/config'

import { CoreRouter } from 'clear-router/core'
import { Validator } from 'kanun'
import { ValidatorDBDriver } from './ValidatorDBDriver'
import { bootArkorm } from './arkorm'
import { clearRouterPlugin } from '@arkormx/plugin-clear-router'

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
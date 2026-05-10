import { CoreRouter } from 'clear-router/core'
import { Validator } from 'kanun'
import { ValidatorDBDriver } from './ValidatorDBDriver'
import { clearRouterPlugin } from '@arkormx/plugin-clear-router'

CoreRouter.use(clearRouterPlugin)
Validator.useDatabase(new ValidatorDBDriver())
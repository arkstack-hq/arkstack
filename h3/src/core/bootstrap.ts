import Application from 'src/core/app'
import ErrorHandler from './utils/request-handlers'
import { H3 } from 'h3'
import { Validator } from 'kanun'
import { ValidatorDBDriver } from './utils/drivers/ValidatorDBDriver'
import { fileValidatorPlugin } from '@kanun-hq/plugin-file'
import { str } from '@h3ravel/support'

globalThis.str = str
Validator.useDatabase(new ValidatorDBDriver())
Validator.use(fileValidatorPlugin)

export const h3App = new H3({
  onError: ErrorHandler,
})

export const app = new Application(h3App) 
import '@arkstack/database/setup'

import Application from 'src/core/app'
import { Validator } from 'kanun'
import { View } from '@arkstack/view'
import { fileValidatorPlugin } from '@kanun-hq/plugin-file'

View.boot()
Validator.use(fileValidatorPlugin)

export const app = new Application()
export const h3App = app.getAppInstance()
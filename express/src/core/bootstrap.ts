import '@arkstack/database/setup'
import '@arkstack/http/setup'

import Application from 'src/core/app'
import { Validator } from 'kanun'
import { View } from '@arkstack/view'
import express from 'express'
import { fileValidatorPlugin } from '@kanun-hq/plugin-file'

View.boot()
Validator.use(fileValidatorPlugin)

const expressApp = express()

export const app = new Application(expressApp)
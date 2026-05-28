import '@arkstack/database/setup'
import '@arkstack/http/setup'

import * as express from 'express'

import Application from '../core/app'
import { Validator } from 'kanun'
import { View } from '@arkstack/view'
import { fileValidatorPlugin } from '@kanun-hq/plugin-file'
import { interopDefault } from '@arkstack/common'

View.boot()
Validator.use(fileValidatorPlugin)

const expressApp = interopDefault(express)()

export const app = new Application(expressApp)

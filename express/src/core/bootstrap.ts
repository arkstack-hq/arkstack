import Application from 'src/core/app'
import { Validator } from 'kanun'
import { ValidatorDBDriver } from './utils/drivers/ValidatorDBDriver'
import express from 'express'
import { fileValidatorPlugin } from '@kanun-hq/plugin-file'
import { str } from '@h3ravel/support'

globalThis.str = str
Validator.useDatabase(new ValidatorDBDriver())
Validator.use(fileValidatorPlugin)

const expressApp = express()

export const app = new Application(expressApp)
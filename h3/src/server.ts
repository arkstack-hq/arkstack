import { app } from './core/bootstrap'
import { bootWithDetectedPort } from '@arkstack/common'
import { env } from './core/utils/helpers'

await bootWithDetectedPort(async (port) => {
  await app.boot(port)
}, env('APP_PORT', 3000), app)

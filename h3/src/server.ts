import { app } from './core/bootstrap'
import { bootWithDetectedPort } from '@arkstack/common'
import { env } from './core/utils/helpers'

await bootWithDetectedPort(async (port) => {
  if (env('NODE_ENV') === 'development') {
    await app.boot(port)
  } else {
    await app.boot(parseInt(env('APP_PORT', String(port)), 10))
  }
}, undefined, app)

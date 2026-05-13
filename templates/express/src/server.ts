import { bootWithDetectedPort, env } from '@arkstack/common'

import { app } from './core/bootstrap'

await bootWithDetectedPort(async (port) => {
  await app.boot(port)
}, env('APP_PORT', 3000), app)

import { cors, requestLogger, resora } from '@arkstack/driver-h3/middlewares'

import { MiddlewareConfig } from '@arkstack/driver-h3/types'
import corsConfig from './cors'
import { useH3UploadContext } from '@kanun-hq/plugin-file'

export default (): MiddlewareConfig => {
  const cConf = corsConfig()

  return {
    global: [
      cors({
        origin: cConf.allowed_origins.length > 0 ? cConf.allowed_origins : true,
        credentials: true,
      }),
    ],
    before: [
      resora(),
      function ({ req }, next) {
        useH3UploadContext(req)
        next()
      }
    ],
    after: [
      requestLogger()
    ],
  }
} 

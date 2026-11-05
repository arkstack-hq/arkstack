import { formdata, requestLogger, resora } from '@arkstack/driver-fastify/middlewares'

import { MiddlewareConfig } from '@arkstack/driver-fastify/types'
import { localeMiddleware } from '@arkstack/lang'
import { useExpressUploadContext } from '@kanun-hq/plugin-file'

export default (): MiddlewareConfig => {
  return {
    global: [],
    before: [
      formdata(),
      resora(),
      localeMiddleware() as never,
      async (req) => {
        useExpressUploadContext({ files: req.uploads })
      },
    ],
    after: [requestLogger()],
  }
}

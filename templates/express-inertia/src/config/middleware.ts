import { formdata, requestLogger, resora } from '@arkstack/driver-express/middlewares'

import { MiddlewareConfig } from '@arkstack/driver-express/types'
import cors from 'cors'
import corsConfig from './cors'
import express from 'express'
import { useExpressUploadContext } from '@kanun-hq/plugin-file'

export default (): MiddlewareConfig => {
  const cConf = corsConfig()

  return {
    global: [
      // Parse application/json
      express.json({
        verify: (req, _res, buffer) => {
          req.rawBody = Buffer.from(buffer)
        },
      }),
      express.urlencoded({ extended: true }),
      cors({
        origin: cConf.allowed_origins.length > 0 ? cConf.allowed_origins : true,
        credentials: true,
      }),
      formdata.any(),
    ],
    before: [
      resora(),
      (req, _res, next) => {
        useExpressUploadContext(req as never)
        next()
      }
    ],
    after: [
      requestLogger()
    ],
  }
} 

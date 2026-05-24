import { GenericResource, Resource, ResourceCollection } from 'resora'
import { cors, requestLogger } from '@arkstack/driver-h3/middlewares'

import { H3 } from 'h3'
import { MiddlewareConfig } from 'src/types/config'
import corsConfig from './cors'
import { useH3UploadContext } from '@kanun-hq/plugin-file'

const config = (_app: H3): MiddlewareConfig => {
  const cConf = corsConfig()

  return {
    global: [
      cors({
        origin: cConf.allowed_origins.length > 0 ? cConf.allowed_origins : true,
        credentials: true,
      }),
    ],
    before: [
      function ({ req, res }, next) {
        Resource.setCtx({ req, res })
        GenericResource.setCtx({ req, res })
        ResourceCollection.setCtx({ res, req })
        useH3UploadContext(req)
        next()
      }
    ],
    after: [
      requestLogger()
    ],
  }
}

export default config

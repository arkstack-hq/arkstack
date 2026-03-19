import { GenericResource, Resource, ResourceCollection } from 'resora'

import { H3 } from 'h3'
import { MiddlewareConfig } from 'src/types/config'
import { cors } from '@app/http/middlewares/cors'
import { useH3UploadContext } from '@kanun-hq/plugin-file'

const config = (_app: H3): MiddlewareConfig => {
  return {
    global: [cors()],
    before: [
      function ({ req, res }, next) {
        Resource.setCtx({ req, res })
        GenericResource.setCtx({ req, res })
        ResourceCollection.setCtx({ res, req })
        useH3UploadContext(req)
        next()
      }
    ],
    after: [],
  }
}

export default config

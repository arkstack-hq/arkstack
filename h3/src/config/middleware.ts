import { GenericResource, Resource, ResourceCollection } from 'resora'

import { H3 } from 'h3'
import { MiddlewareConfig } from 'src/types/config'
import { cors } from '@app/http/middlewares/cors'

const config = (_app: H3): MiddlewareConfig => {
  return {
    global: [cors()],
    before: [
      ({ req, res }, next) => {
        Resource.setCtx({ req, res })
        GenericResource.setCtx({ req, res })
        ResourceCollection.setCtx({ res, req })
        next()
      }
    ],
    after: [],
  }
}

export default config

import { GenericResource, Resource, ResourceCollection } from 'resora'
import express, { Express } from 'express'

import { MiddlewareConfig } from 'src/types/config'
import cors from 'cors'

const config = (_app: Express): MiddlewareConfig => {
  return {
    global: [
      // Parse application/json
      express.json(),
      // Parse application/x-www-form-urlencoded (for non-multipart forms)
      express.urlencoded({ extended: true }),
      // Enable CORS for all routes
      cors(),
    ],
    before: [
      (req, res, next) => {
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

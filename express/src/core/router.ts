import { ArkstackRouteListOptions } from '@arkstack/contract'
import { Router as ClearRouter } from 'clear-router/express'
import { RequestError } from './utils/errors'
import { clearRouterExpressPlugin } from '@resora/plugin-clear-router'
import express from 'express'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerPlugin } from 'resora'

registerPlugin(clearRouterExpressPlugin)

export class Router extends ClearRouter {
  static async bind () {
    const router = express.Router()

    // Register API routes
    await ClearRouter.group('/api', async () => {
      await import(pathToFileURL(join(process.cwd(), 'src/routes/api.ts')).href)
    })

    // Register web routes
    await ClearRouter.group('/', async () => {
      await import(pathToFileURL(join(process.cwd(), 'src/routes/web.ts')).href)
    })

    // Apply the registered routes to the Express application
    ClearRouter.apply(router)

    // Handle unmatched routes
    router.all('/*splat', (req, _res, next) => {
      const url = req.originalUrl || req.url
      next(new RequestError(`Cannot find any route matching [${req.method}] ${url}`, 404))
    })

    return router
  }

  static async list (_options: ArkstackRouteListOptions = {}) {
    await this.bind()

    return this.allRoutes()
  }
}

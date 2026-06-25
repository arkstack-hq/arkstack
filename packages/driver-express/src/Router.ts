import { Logger, RequestException, resolveRuntimeModule } from '@arkstack/common'
import express, { Router as ExpressRouter } from 'express'

import { ArkstackRouteListOptions } from '@arkstack/contract'
import { Router as ClearRouter } from 'clear-router/express'
import { type Route } from 'clear-router'
import { clearRouterExpressPlugin } from '@resora/plugin-clear-router'
import { registerPlugin } from 'resora'
import type { Handler, HttpContext, Middleware } from 'clear-router/types/express'

registerPlugin(clearRouterExpressPlugin)
ClearRouter.configure({
  inferParamName: true
})

export class Router extends ClearRouter {
  static async bind (): Promise<ExpressRouter> {
    const router = express.Router()

    // Register API routes
    try {
      await ClearRouter.group('/api', resolveRuntimeModule('src/routes/api.ts'))
    } catch (e: any) {
      Logger.error('ERROR: Unable to load "api.ts" routes: ' + e.message, false)
    }

    // Register web routes
    try {
      await ClearRouter.group('/', resolveRuntimeModule('src/routes/web.ts'))
    } catch (e: any) {
      Logger.error('ERROR: Unable to load "web.ts" routes: ' + e.message, false)
    }

    // Apply the registered routes to the Express application
    ClearRouter.apply(router)

    // Handle unmatched routes
    router.all('/*splat', (req, _res, next) => {
      const url = req.originalUrl || req.url
      next(new RequestException(`Cannot find any route matching [${req.method}] ${url}`, 404))
    })

    return router
  }

  static async list (
    _options: ArkstackRouteListOptions = {}
  ): Promise<Array<Route<HttpContext, Middleware, Handler>>> {
    await this.bind()

    return this.allRoutes() as never
  }
}

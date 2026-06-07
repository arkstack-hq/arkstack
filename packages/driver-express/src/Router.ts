import { RequestException } from '@arkstack/common'
import express, { Router as ExpressRouter } from 'express'

import { Arkstack, ArkstackRouteListOptions } from '@arkstack/contract'
import { Router as ClearRouter } from 'clear-router/express'
import { type Route } from 'clear-router'
import { clearRouterExpressPlugin } from '@resora/plugin-clear-router'
import { join } from 'node:path'
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
      await ClearRouter.group('/api', join(Arkstack.rootDir(), 'src/routes/api.ts'))
    } catch { /** */ }

    // Register web routes
    try {
      await ClearRouter.group('/', join(Arkstack.rootDir(), 'src/routes/web.ts'))
    } catch { /** */ }

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

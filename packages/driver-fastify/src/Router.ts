import type { FastifyApp, Handler, HttpContext, Middleware } from 'clear-router/types/fastify'
import { Logger, RequestException, resolveRuntimeModule } from '@arkstack/common'

import { ArkstackRouteListOptions } from '@arkstack/contract'
import { Router as ClearRouter } from 'clear-router/fastify'
import { type Route } from 'clear-router'
import { arkstackHttpPlugin } from '@arkstack/http'
import { clearRouterFastifyPlugin } from '@resora/plugin-clear-router'
import { registerPlugin } from 'resora'

registerPlugin(clearRouterFastifyPlugin)
void ClearRouter.use(arkstackHttpPlugin)
ClearRouter.configure({
  inferParamName: true,
})

export class Router extends ClearRouter {
  /**
   * Loads the api and web route files, applies them to the Fastify app and
   * turns unmatched requests into a 404 RequestException.
   *
   * @param app
   * @returns
   */
  static async bind(app: FastifyApp): Promise<FastifyApp> {
    await this.load()

    ClearRouter.apply(app)

    app.setNotFoundHandler((req) => {
      throw new RequestException(`Cannot find any route matching [${req.method}] ${req.url}`, 404)
    })

    return app
  }

  static async list(_options: ArkstackRouteListOptions = {}): Promise<Array<Route<HttpContext, Middleware, Handler>>> {
    await this.load()

    return this.allRoutes() as never
  }

  /**
   * Registers the routes declared in the api and web route files.
   */
  static async load(): Promise<void> {
    try {
      await ClearRouter.group('/api', resolveRuntimeModule('src/routes/api.ts'))
    } catch (e: any) {
      Logger.error('ERROR: Unable to load "api.ts" routes: ' + e.message, false)
    }

    try {
      await ClearRouter.group('/', resolveRuntimeModule('src/routes/web.ts'))
    } catch (e: any) {
      Logger.error('ERROR: Unable to load "web.ts" routes: ' + e.message, false)
    }
  }
}

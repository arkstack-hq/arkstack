import { ArkstackRouteListOptions } from '@arkstack/contract'
import { Router as ClearRouter } from 'clear-router/h3'
import { H3 } from 'h3'
import type { H3App, Handler, HttpContext, Middleware } from 'clear-router/types/h3'
import { type Route } from 'clear-router'
import { clearRouterH3Plugin } from '@resora/plugin-clear-router'
import { arkstackHttpPlugin } from '@arkstack/http'
import { registerPlugin } from 'resora'
import { resolveRuntimeModule } from '@arkstack/common'

registerPlugin(clearRouterH3Plugin)
void ClearRouter.use(arkstackHttpPlugin)
ClearRouter.configure({
  inferParamName: true
})

export class Router extends ClearRouter {
  static async bind (app: H3): Promise<H3App> {

    // Register API routes
    try {
      await ClearRouter.group('/api', resolveRuntimeModule('src/routes/api.ts'))
    } catch { /** */ }

    // Register web routes
    try {
      await ClearRouter.group('/', resolveRuntimeModule('src/routes/web.ts'))
    } catch { /** */ }

    // Apply the registered routes to the H3 application
    const router = ClearRouter.apply(app)

    return router
  }

  static async list (
    _options: ArkstackRouteListOptions = {}, app: H3
  ): Promise<Route<HttpContext, Middleware, Handler>[]> {
    await this.bind(app)

    return this.allRoutes() as never
  }
}

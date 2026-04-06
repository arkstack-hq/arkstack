import { ArkstackRouteListOptions } from '@arkstack/contract'
import { Router as ClearRouter } from 'clear-router/h3'
import { H3 } from 'h3'
import { clearRouterH3Plugin } from '@resora/plugin-clear-router'
import { importFile } from '@arkstack/common'
import { join } from 'node:path'
import { registerPlugin } from 'resora'

registerPlugin(clearRouterH3Plugin)

export class Router extends ClearRouter {
  static async bind (app: H3) {
    // Register API routes
    await ClearRouter.group('/api', async () => {
      await importFile(join(process.cwd(), 'src/routes/api.ts'))
    })

    // Register web routes
    await ClearRouter.group('/', async () => {
      await importFile(join(process.cwd(), 'src/routes/web.ts'))
    })

    // Apply the registered routes to the H3 application
    const router = ClearRouter.apply(app)

    return router
  }

  static async list (_options: ArkstackRouteListOptions = {}, app: H3) {
    await this.bind(app)

    return this.allRoutes()
  }
}

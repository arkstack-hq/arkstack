import { Router } from '@arkstack/driver-express'
import path from 'path'
import { ExpressDriver } from '@arkstack/driver-express'
import { Arkstack, ArkstackRouterContract, ArkstackRouteListOptions } from '@arkstack/contract'
import { type Express, type Handler } from 'express'

export default class Application extends Arkstack<Express, unknown, Handler> {
  /**
   * Creates an instance of the Application class, initializing 
   * the Express driver with the provided options and creating an Express 
   * application instance.
   * 
   * @param app 
   */
  constructor(app?: Express) {
    super()
    this.driver = new ExpressDriver({
      bindRouter: async (runtime) => {
        runtime.use(await Router.bind())
      },
    })

    this.app = app ?? this.driver.createApp()

    Application.app = this.app
    globalThis.app = () => this.app as never
  }

  /**
   * Gets the ArkstackRouterContract implementation for the Express framework.
   * 
   * @returns 
   */
  getRouter (): ArkstackRouterContract<Express, unknown> {
    return {
      bind: (_app: Express) => Router.bind(),
      list: (options: ArkstackRouteListOptions = {}) => Router.list(options),
    }
  }

  /**
   * Boots the application by mounting public assets, binding the 
   * router, applying middleware, and starting the server.
   * 
   * @param port    The numeric port to run the server on
   * @param defer   Set to true to skip server startup
   */
  public async boot (port: number, defer = false) {
    // Load public assets
    await this.driver.mountPublicAssets(this.app, path.join(Arkstack.rootDir(), 'public'))

    // Apply all middleware
    await this.driver.applyMiddleware(this.app, config('middleware') as any)

    // Bind the router 
    await this.driver.bindRouter(this.app)

    // Error Handler
    await this.driver.registerErrorHandler?.(this.app)

    // Start the server
    if (defer !== true) {
      await this.driver.start(this.app, port)
    }
  }
}

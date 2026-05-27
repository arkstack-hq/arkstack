import { bindGracefulShutdown, Hook } from '@arkstack/common'
import { Router } from '@arkstack/driver-express'
import path from 'path'
import { ExpressDriver } from '@arkstack/driver-express'
import { Arkstack, ArkstackRouterContract, ArkstackRouteListOptions } from '@arkstack/contract'
import { type Express, type Handler } from 'express'

export default class Application extends Arkstack<Express, unknown, Handler> {
  private static app: Express

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
   * Gets the Express application instance.
   * 
   * @returns 
   */
  getAppInstance () {
    return this.app
  }

  /**
   * Gets the static Express application instance.
   * 
   * @returns 
   */
  static getAppInstance () {
    return Application.app
  }

  /**
   * Gets the ArkstackKitDriver instance used by the application.
   * 
   * @returns 
   */
  getDriver () {
    return this.driver
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
   * @param port      The numeric port to run the server on
   * @param dontStart Set to true to skip server startup
   */
  public async boot (port: number, dontStart = false) {
    if (Hook.has('boot', 'before')) Hook.get('boot', 'before')?.(port, this.app)

    // Load public assets
    await this.driver.mountPublicAssets(this.app, path.join(Arkstack.rootDir(), 'public'))

    // Apply all middleware
    await this.driver.applyMiddleware(this.app, config('middleware') as never)

    // Bind the router 
    await this.driver.bindRouter(this.app)

    // Error Handler
    await this.driver.registerErrorHandler?.(this.app)

    // Start the server
    if (dontStart !== true) {
      await this.driver.start(this.app, port)
    }

    if (Hook.has('boot', 'after')) Hook.get('boot', 'after')?.(port, this.app)

    // Handle graceful shutdown
    bindGracefulShutdown(async () => await this.shutdown())
  }

  /**
   * Shuts down the application by disconnecting from the database and exiting the process.
   */
  async shutdown () {
    if (Hook.has('shutdown', 'before')) Hook.get('shutdown', 'after')?.()
    process.exit(0)
  }
}

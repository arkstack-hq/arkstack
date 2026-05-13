import { bindGracefulShutdown, Hook } from '@arkstack/common'
import { Router } from '@arkstack/driver-express'
import path from 'path'
import { ExpressDriver } from '@arkstack/driver-express'
import { ArkstackKitDriver, ArkstackRouterAwareCore, ArkstackRouterContract, ArkstackRouteListOptions } from '@arkstack/contract'
import { type Express, type Handler } from 'express'

export default class Application implements ArkstackRouterAwareCore<Express, unknown> {
  private app: Express
  private static app: Express
  private driver: ArkstackKitDriver<Express, Handler>

  /**
   * Creates an instance of the Application class, initializing 
   * the Express driver with the provided options and creating an Express 
   * application instance.
   * 
   * @param app 
   */
  constructor(app?: Express) {
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
   * @param port 
   */
  public async boot (port: number) {
    if (Hook.has('boot', 'before')) Hook.get('boot', 'before')?.(port, this.app)

    // Load public assets
    await this.driver.mountPublicAssets(this.app, path.join(process.cwd(), 'public'))

    // Apply all middleware
    await this.driver.applyMiddleware(this.app, config('middleware'))

    // Bind the router 
    await this.driver.bindRouter(this.app)

    // Error Handler
    await this.driver.registerErrorHandler?.(this.app)

    // Start the server
    await this.driver.start(this.app, port)

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

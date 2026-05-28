import { Arkstack, ArkstackRouterContract, ArkstackRouteListOptions } from '@arkstack/contract'
import { H3Driver, type H3Middleware } from '@arkstack/driver-h3'
import { H3 } from 'h3'
import { Router } from '@arkstack/driver-h3'

export default class Application extends Arkstack<H3, unknown, H3Middleware> {
  /**
   * Creates an instance of the Application class, initializing 
   * the H3 driver with the provided options and creating an H3 application instance.
   * 
   * @param app 
   */
  constructor(app?: H3) {
    super()
    this.driver = new H3Driver({
      bindRouter: async (runtime) => {
        await Router.bind(runtime)
      },
    })

    this.app = app ?? this.driver.createApp()

    Application.app = this.app
    globalThis.app = () => this.app as never
  }

  /**
   * Gets the ArkstackRouterContract implementation for the H3 framework.
   * 
   * @returns 
   */
  getRouter (): ArkstackRouterContract<H3, unknown> {
    return {
      bind: (app: H3) => Router.bind(app),
      list: (options: ArkstackRouteListOptions = {}, app?: H3) => Router.list(options, app ?? this.app),
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
    // Load public assets
    await this.driver.mountPublicAssets(this.app, 'public')

    // Apply all middleware
    await this.driver.applyMiddleware(this.app, config('middleware') as never)

    // Bind the router
    await this.driver.bindRouter(this.app)

    // Start the server
    if (dontStart !== true) {
      await this.driver.start(this.app, port)
    }
  }
}

import { Arkstack, ArkstackRouteListOptions, ArkstackRouterContract } from '@arkstack/contract'
import { FastifyDriver, Router } from '@arkstack/driver-fastify'

import type { FastifyInstance } from 'fastify'
import type { FastifyMiddleware } from '@arkstack/driver-fastify/types'
import path from 'path'
import plugins from '../config/plugins'

export default class Application extends Arkstack<FastifyInstance, unknown, FastifyMiddleware> {
  private prepared = false

  /**
   * Creates an instance of the Application class, initializing
   * the Fastify driver and creating a Fastify instance.
   *
   * @param app
   */
  constructor(app?: FastifyInstance) {
    super()
    this.driver = new FastifyDriver({
      bindRouter: async (runtime) => {
        await Router.bind(runtime)
      },
      plugins: plugins(),
    })

    this.app = app ?? this.driver.createApp()

    Application.app = this.app
    globalThis.app = () => this.app as never
  }

  /**
   * Gets the ArkstackRouterContract implementation for the Fastify framework.
   *
   * @returns
   */
  getRouter(): ArkstackRouterContract<FastifyInstance, unknown> {
    return {
      bind: (app: FastifyInstance) => Router.bind(app),
      list: (options: ArkstackRouteListOptions = {}) => Router.list(options),
    }
  }

  /**
   * Boots the application by mounting public assets, applying middleware,
   * binding the router, and starting the server. Fastify can only be set up
   * once, so later calls only start the server.
   *
   * @param port    The numeric port to run the server on
   * @param defer   Set to true to skip server startup
   */
  public async boot(port: number, defer = false) {
    if (!this.prepared) {
      this.prepared = true

      // Load public assets, middleware, routes and the error handler
      await this.driver.prepare(this.app, {
        publicPath: path.join(Arkstack.rootDir(), 'public'),
        middleware: config('middleware') as never,
      })
    }

    // Start the server
    if (defer !== true) {
      await this.driver.start(this.app, port)
    }
  }
}

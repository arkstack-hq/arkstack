import express, { type ErrorRequestHandler, type Express, type Handler } from 'express'

import { ExpressDriverOptions, Middleware, MiddlewareConfig } from './types'
import { Logger, ServerDriver, devTlsCredentials } from '@arkstack/common'

import { PromiseOrValue } from '@arkstack/contract'
import { defaultErrorHandler } from './error-handler'
import https from 'node:https'
import { resolveMiddleware } from '@arkstack/http'

/**
 * The ExpressDriver class implements the ArkstackKitDriver
 * contract for the Express framework.
 */
export class ExpressDriver extends ServerDriver<Express, Handler> {
  readonly name = 'express'
  private readonly options: ExpressDriverOptions

  /**
   * Creates an instance of ExpressDriver.
   *
   * @param options
   */
  constructor(options: ExpressDriverOptions) {
    super()
    this.options = options
  }

  /**
   * Creates an Express application instance.
   *
   * @returns
   */
  createApp(): Express {
    return express()
  }

  /**
   * Mounts static assets from the specified public path to the Express application.
   *
   * @param app
   * @param publicPath
   */
  mountPublicAssets(app: Express, publicPath: string): PromiseOrValue<void> {
    if (this.options.mountPublicAssets) {
      return this.options.mountPublicAssets(app, publicPath)
    }

    app.use(
      express.static(publicPath, {
        maxAge: '1y',
        immutable: true,
        setHeaders: (res) => {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        },
      }),
    )
  }

  /**
   * Binds the router to the Express application using the provided bindRouter function.
   *
   * @param app
   */
  bindRouter(app: Express): PromiseOrValue<void> {
    return this.options.bindRouter(app)
  }

  /**
   * Applies middleware to the Express application.
   *
   * @param app
   * @param middleware
   */
  applyMiddleware(app: Express, middleware: Middleware | MiddlewareConfig): void {
    if (!middleware) return

    if (typeof middleware === 'function') {
      app.use(resolveMiddleware(middleware))

      return
    }

    for (const [pos, entries] of Object.entries(middleware) as [string, Middleware[]][]) {
      for (const instance of entries) {
        const entry = resolveMiddleware(instance)

        if (pos === 'after') {
          app.use((req, res, next) => {
            // The response is already sent, so `next` must not resume the router.
            res.once('finish', () => {
              Promise.resolve(entry(req, res, () => {})).catch((error) => {
                Logger.error(error instanceof Error ? error.message : String(error), false)
              })
            })
            next()
          })
        } else {
          app.use(entry)
        }
      }
    }
  }

  /**
   * Registers an error handler middleware to the Express
   * application if provided in the options.
   *
   * @param app
   */
  registerErrorHandler(app: Express): void {
    app.use((this.options.errorHandler ?? defaultErrorHandler) as ErrorRequestHandler)
  }

  /**
   * Starts the Express server on the specified port.
   *
   * @param app
   * @param port
   */
  async start(app: Express, port: number): Promise<void> {
    const binding = this.binding(port)
    const onListen = () => this.announce(binding)

    if (binding.secure) {
      // Dev HTTPS: serve with an in-memory self-signed certificate.
      const credentials = await devTlsCredentials()

      https.createServer({ key: credentials.key, cert: credentials.cert }, app).listen(port, binding.host, onListen)

      return
    }

    app.listen(port, binding.host, onListen)
  }
}

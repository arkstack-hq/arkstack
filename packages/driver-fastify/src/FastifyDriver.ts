import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify'
import type { FastifyDriverOptions, FastifyMiddleware, FastifyPluginEntry, Middleware, MiddlewareConfig } from './types'
import { Logger, ServerDriver, devTlsCredentials } from '@arkstack/common'

import { PromiseOrValue } from '@arkstack/contract'
import { defaultErrorHandler } from './error-handler'
import fastifyFormbody from '@fastify/formbody'
import fastifyMultipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import https from 'node:https'
import { resolveMiddleware } from '@arkstack/http'

/**
 * Where each Arkstack middleware position runs in Fastify's request lifecycle.
 */
const lifecycleHooks = {
  global: 'onRequest',
  before: 'preHandler',
  after: 'onResponse',
} as const

/**
 * Creates the HTTPS server for dev HTTPS. The certificate is attached on start.
 *
 * @param handler
 */
const secureServer = (handler: (req: any, res: any) => void) => https.createServer(handler)

/**
 * The FastifyDriver class implements the ArkstackKitDriver
 * contract for the Fastify framework.
 */
export class FastifyDriver extends ServerDriver<FastifyInstance, FastifyMiddleware> {
  readonly name = 'fastify'
  private readonly options: FastifyDriverOptions
  private readonly errorHandled = new WeakSet<FastifyInstance>()

  /**
   * Creates an instance of FastifyDriver.
   *
   * @param options
   */
  constructor(options: FastifyDriverOptions) {
    super()
    this.options = options
  }

  /**
   * Creates a Fastify instance with the error handler, form and multipart body
   * parsing, plus any plugins passed in the driver options.
   *
   * @returns
   */
  createApp(): FastifyInstance {
    const app = this.options.createApp?.() ?? Fastify(this.binding(0).secure ? { serverFactory: secureServer } : {})

    // Routes capture the error handler when they are built, so it is set before any route exists.
    this.registerErrorHandler(app)
    this.registerPlugins(app, [fastifyFormbody, fastifyMultipart, ...(this.options.plugins ?? [])])

    return app
  }

  /**
   * Registers Fastify plugins on the given instance.
   *
   * @param app
   * @param plugins
   */
  registerPlugins(app: FastifyInstance, plugins: FastifyPluginEntry[]): void {
    for (const entry of plugins) {
      const [plugin, options] = Array.isArray(entry) ? entry : [entry, {}]

      app.register(plugin, options)
    }
  }

  /**
   * Serves static assets from the specified public path.
   *
   * @param app
   * @param publicPath
   */
  mountPublicAssets(app: FastifyInstance, publicPath: string): PromiseOrValue<void> {
    if (this.options.mountPublicAssets) {
      return this.options.mountPublicAssets(app, publicPath)
    }

    app.register(fastifyStatic, {
      root: publicPath,
      maxAge: '1y',
      immutable: true,
      setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      },
    })
  }

  /**
   * Binds the router to the Fastify application using the provided bindRouter function.
   *
   * @param app
   */
  bindRouter(app: FastifyInstance): PromiseOrValue<void> {
    return this.options.bindRouter(app)
  }

  /**
   * Applies middleware as Fastify lifecycle hooks: `global` runs on request,
   * `before` runs once the body is parsed, and `after` runs once the response is sent.
   *
   * @param app
   * @param middleware
   */
  applyMiddleware(app: FastifyInstance, middleware: Middleware | MiddlewareConfig): void {
    if (!middleware) return

    if (typeof middleware === 'function') {
      app.addHook('onRequest', resolveMiddleware(middleware) as never)

      return
    }

    for (const [pos, entries] of Object.entries(middleware) as [keyof MiddlewareConfig, Middleware[]][]) {
      const hook = lifecycleHooks[pos]

      for (const instance of entries) {
        const entry = resolveMiddleware(instance) as FastifyMiddleware

        if (pos === 'after') {
          app.addHook(hook, async (req: FastifyRequest, reply: FastifyReply) => {
            try {
              await this.runMiddleware(entry, req, reply)
            } catch (error) {
              Logger.error(error instanceof Error ? error.message : String(error), false)
            }
          })
        } else if (entry.length >= 3) {
          // Callback middleware calls `done` itself, so any async context it opens
          // around `done` (locale, request scope) carries on into the handler.
          app.addHook(hook, (req: FastifyRequest, reply: FastifyReply, done: (error?: Error) => void) => {
            Promise.resolve(entry(req, reply, done)).catch(done)
          })
        } else {
          app.addHook(hook, async (req: FastifyRequest, reply: FastifyReply) => {
            await entry(req, reply, () => undefined)
          })
        }
      }
    }
  }

  /**
   * Registers the error handler from the options, or the built-in one, once per app.
   *
   * @param app
   */
  registerErrorHandler(app: FastifyInstance): void {
    if (this.errorHandled.has(app)) return

    this.errorHandled.add(app)
    app.setErrorHandler(this.options.errorHandler ?? defaultErrorHandler)
  }

  /**
   * Starts the Fastify server on the specified port.
   *
   * @param app
   * @param port
   */
  async start(app: FastifyInstance, port: number): Promise<void> {
    const binding = this.binding(port)

    if (binding.secure && app.server instanceof https.Server) {
      // Dev HTTPS: serve with an in-memory self-signed certificate.
      const credentials = await devTlsCredentials()

      app.server.setSecureContext({ key: credentials.key, cert: credentials.cert })
    }

    await app.listen({ port, host: binding.host })
    await this.announce(binding)
  }

  /**
   * Runs a middleware in either async or callback form and settles once it is done.
   *
   * @param middleware
   * @param req
   * @param reply
   */
  private runMiddleware(middleware: FastifyMiddleware, req: FastifyRequest, reply: FastifyReply): Promise<unknown> {
    if (middleware.length < 3) {
      return Promise.resolve((middleware as (req: FastifyRequest, reply: FastifyReply) => unknown)(req, reply))
    }

    return new Promise((resolve, reject) => {
      middleware(req, reply, (error?: Error) => (error ? reject(error) : resolve(undefined)))
    })
  }
}

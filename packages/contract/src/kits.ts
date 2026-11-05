import { Hook, Plugins } from '@arkstack/foundry'

import { ArkstackMiddlewareConfig } from './http'
import { PromiseOrValue } from './Arkstack'

/**
 * What a driver passes to the `server:start` hook (`after` position) once its
 * server is listening, and any tunnel is open.
 */
export interface ServerStartInfo {
  /** The address the server is bound to, e.g. `0.0.0.0`. */
  host: string
  port: number
  scheme: 'http' | 'https'
  secure: boolean
  /** A browsable local URL (`localhost` when bound to every interface). */
  url: string
  /** The public tunnel URL (`TUNNEL_URL`, or the one `ark dev -t` opened), if any. */
  tunnelUrl?: string
}

/** What the `server:start` hook's `tunneled` position receives: a tunnel is always open. */
export type TunneledServerStartInfo = ServerStartInfo & { tunnelUrl: string }

/**
 * What {@link ArkstackKitDriver.prepare} sets up on the runtime app.
 */
export interface DriverPrepareOptions<TMiddleware> {
  /** The directory static assets are served from. Skipped when not set. */
  publicPath?: string
  /** The app middleware, usually `config('middleware')`. Skipped when not set. */
  middleware?: ArkstackMiddlewareConfig<TMiddleware> | TMiddleware
}

/**
 * What each position of the `driver:prepare` hook receives.
 */
export interface DriverPrepareContext<TApp = unknown> {
  /** The runtime app, such as an Express app or a Fastify instance. */
  app: TApp
  driver: ArkstackKitDriver<TApp, unknown>
}

/**
 * The ArkstackKitDriver class defines the contract for a driver
 * that can be used with the ArkstackKitContract.
 */
export abstract class ArkstackKitDriver<TApp, TMiddleware> {
  abstract readonly name: string
  abstract createApp(): TApp
  abstract mountPublicAssets(app: TApp, publicPath: string): PromiseOrValue<void>
  abstract bindRouter(app: TApp): PromiseOrValue<void>
  abstract applyMiddleware(app: TApp, middleware: ArkstackMiddlewareConfig<TMiddleware>): PromiseOrValue<void>
  abstract applyMiddleware(app: TApp, middleware: TMiddleware): PromiseOrValue<void>
  registerErrorHandler(_app: TApp): PromiseOrValue<void> {
    return
  }
  abstract start(app: TApp, port: number): PromiseOrValue<void>

  /**
   * Sets the app up for serving: public assets, middleware, routes, then the
   * error handler. Plugins join in through the `driver:prepare` hook, which
   * runs `before` all of it, `router` just before routes are bound, and `after`
   * the error handler.
   *
   * @param app
   * @param options
   */
  async prepare(app: TApp, options: DriverPrepareOptions<TMiddleware> = {}): Promise<void> {
    Plugins.assertSupports(this.name)

    const context: DriverPrepareContext<TApp> = { app, driver: this }

    await Hook.emit('driver:prepare', 'before', context)

    if (options.publicPath) await this.mountPublicAssets(app, options.publicPath)
    if (options.middleware) await this.applyMiddleware(app, options.middleware as TMiddleware)

    await Hook.emit('driver:prepare', 'router', context)
    await this.bindRouter(app)
    await this.registerErrorHandler(app)
    await Hook.emit('driver:prepare', 'after', context)
  }
}

/**
 * The ArkstackKitContract class defines the contract for an
 * application that uses the ArkstackKitDriver.
 */
export abstract class ArkstackKitContract<TApp, TMiddleware> {
  abstract app: TApp
  abstract driver: ArkstackKitDriver<TApp, TMiddleware>
  abstract middleware: ArkstackMiddlewareConfig<TMiddleware>
  abstract boot(port: number): Promise<void>
  abstract shutdown(): Promise<void>
}

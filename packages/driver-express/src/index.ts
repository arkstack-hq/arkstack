import express, { type ErrorRequestHandler, type Express, type Handler } from 'express'

import { ArkstackKitDriver, PromiseOrValue } from '@arkstack/contract'
import { Logger, env } from '@arkstack/common'
import { defaultErrorHandler } from './error-handler'
import { Middleware, MiddlewareConfig } from './types'
import { resolveMiddleware } from '@arkstack/http'
import ngrok from '@ngrok/ngrok'

export interface ExpressDriverOptions {
    bindRouter: (app: Express) => PromiseOrValue<void>;
    mountPublicAssets?: (app: Express, publicPath: string) => PromiseOrValue<void>;
    errorHandler?: ErrorRequestHandler | Handler;
}

/**
 * The ExpressDriver class implements the ArkstackKitDriver 
 * contract for the Express framework.
 */
export class ExpressDriver extends ArkstackKitDriver<Express, Handler> {
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

        app.use(express.static(publicPath, {
            maxAge: '1y',
            immutable: true,
            setHeaders: (res) => {
                res.setHeader('Access-Control-Allow-Origin', '*')
                res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            },
        }))
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
    applyMiddleware(
        app: Express,
        middleware: Middleware | MiddlewareConfig,
    ): void {
        if (!middleware) return

        if (typeof middleware === 'function') {
            app.use(resolveMiddleware(middleware))

            return
        }

        for (const [pos, entries] of Object.entries(middleware) as [string, Middleware[]][]) {
            for (const instance of entries) {
                const entry = resolveMiddleware(instance)

                if (pos === 'after') {
                    app.use(async (req, res, next) => {
                        res.once('finish', async () => {
                            await entry(req, res, next)
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
     * The bind host can be overridden with the `APP_HOST` (or `HOST`) env
     * variable. It defaults to `0.0.0.0` so the server is reachable on all
     * network interfaces, which platforms like Railway require for their
     * healthcheck proxy to reach the app.
     *
     * @param app
     * @param port
     */
    async start(app: Express, port: number): Promise<void> {
        const host = env('APP_HOST', env('HOST', '0.0.0.0'))
        const tunneled = env<boolean>('TUNNEL', false)

        app.listen(port, host, async () => {
            let log = [
                Logger.log([
                    ['Server is running on', 'white'],
                    [`http://${host}:${port}`, 'cyan']
                ], ' ', false)
            ]

            if (tunneled === true) {
                const listener = await ngrok.forward({
                    addr: port,
                    authtoken: env('NGROK_AUTHTOKEN'),
                    domain: env('NGROK_DOMAIN'),
                })

                const url = listener.url()

                if (url) log = log.concat(Logger.log([
                    ['Trafic has been tunnelled to', 'white'],
                    [url, 'green']
                ], ' ', false))
            }

            console.log(log.join('\n'))
        })
    }
}

export * from './error-handler'
export * from './Router'

import express, { type ErrorRequestHandler, type Express, type Handler } from 'express'

import { ArkstackKitDriver, ArkstackMiddlewareConfig, PromiseOrValue } from '@arkstack/contract'
import { Logger } from '@arkstack/common'

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
    createApp (): Express {
        return express()
    }

    /**
     * Mounts static assets from the specified public path to the Express application.
     * 
     * @param app 
     * @param publicPath 
     */
    mountPublicAssets (app: Express, publicPath: string): PromiseOrValue<void> {
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
    bindRouter (app: Express): PromiseOrValue<void> {
        return this.options.bindRouter(app)
    }

    /**
     * Applies middleware to the Express application.
     * 
     * @param app 
     * @param middleware 
     */
    applyMiddleware (
        app: Express,
        middleware: Handler | ArkstackMiddlewareConfig<Handler>,
    ): void {
        if (typeof middleware === 'function') {
            app.use(middleware)

            return
        }

        for (const [pos, entries] of Object.entries(middleware) as [string, Handler[]][]) {
            for (const entry of entries) {
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
    registerErrorHandler (app: Express): void {
        if (this.options.errorHandler) {
            app.use(this.options.errorHandler as ErrorRequestHandler)
        }
    }

    /**
     * Starts the Express server on the specified port.
     * 
     * @param app 
     * @param port 
     */
    start (app: Express, port: number): void {
        app.listen(port, () => {
            Logger.log([
                ['Server is running on', 'white'],
                [`http://localhost:${port}`, 'cyan']
            ], ' ')
        })
    }
}

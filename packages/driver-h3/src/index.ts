import { ArkstackKitDriver, ArkstackMiddlewareConfig, PromiseOrValue } from '@arkstack/contract'
import { H3, serve, toResponse } from 'h3'

import { Middleware as H3BaseMiddleware } from 'clear-router/types/h3'
import { Logger } from '@arkstack/common'
import { staticAssetHandler } from './middlewares'

// oxlint-disable-next-line typescript/no-explicit-any
export type H3Middleware = H3BaseMiddleware | [H3BaseMiddleware, Record<string, any>];

export interface H3DriverOptions {
    bindRouter: (app: H3) => PromiseOrValue<void>;
    mountPublicAssets?: (app: H3, publicPath: string) => PromiseOrValue<void>;
    createApp?: () => H3;
}

export class H3EventResponse {
    status: number = 200
    statusText?: string

    constructor(public response: Response) {
        this.status = response.status
        this.statusText = response.statusText
    }

    get headers (): Headers {
        return this.response.headers
    }
}

/**
 * The H3Driver class implements the ArkstackKitDriver contract for the H3 framework.
 */
export class H3Driver extends ArkstackKitDriver<H3, H3Middleware> {
    readonly name = 'h3'
    private readonly options: H3DriverOptions

    /**
     * Creates an instance of H3Driver.
     * 
     * @param options 
     */
    constructor(options: H3DriverOptions) {
        super()
        this.options = options
    }

    /**
     * Creates an H3 application instance.
     * 
     * @returns 
     */
    createApp (): H3 {
        return this.options.createApp?.() ?? new H3()
    }

    /**
     * Mounts static assets from the specified public path to the H3 application.
     * 
     * @param app 
     * @param publicPath 
     */
    mountPublicAssets (app: H3, publicPath: string): PromiseOrValue<void> {
        if (this.options.mountPublicAssets) {
            return this.options.mountPublicAssets(app, publicPath)
        }

        app.use(staticAssetHandler(publicPath))
    }

    /**
     * Binds the router to the H3 application using the provided bindRouter function.
     * 
     * @param app 
     */
    bindRouter (app: H3): PromiseOrValue<void> {
        return this.options.bindRouter(app)
    }

    /**
     * Applies middleware to the H3 application.
     * 
     * @param app 
     * @param middleware 
     */
    applyMiddleware (
        app: H3,
        middleware: H3Middleware | ArkstackMiddlewareConfig<H3Middleware>,
    ): void {
        const mw = Array.isArray(middleware) ? middleware[0] : middleware
        const conf = Array.isArray(middleware) && middleware[1] ? middleware[1] : {}

        if (typeof mw === 'function') {
            app.use(mw, conf)

            return
        }

        for (const [pos, entries] of Object.entries(middleware) as [string, H3Middleware[]][]) {
            for (const entry of entries) {
                const mw = Array.isArray(entry) ? entry[0] : entry
                const conf = Array.isArray(entry) && entry[1] ? entry[1] : {}

                if (pos === 'after') {
                    app.use(async (evt, next) => {
                        const response = await toResponse(await next(), evt)
                        // evt.res.status = response.status
                        evt[Symbol.for('h3.internal.event.res') as never] = new H3EventResponse(response) as never
                        await mw(evt, next)
                        next()
                    }, conf)
                } else {
                    app.use(mw, conf)
                }
            }
        }
    }

    /**
     * Starts the H3 server on the specified port.
     * 
     * @param app 
     * @param port 
     */
    start (app: H3, port: number): void {
        serve(app, { port, silent: true }).ready().then(() => {
            Logger.log([
                ['Server is running on', 'white'],
                [`http://localhost:${port}`, 'cyan']
            ], ' ')
        })
    }
}

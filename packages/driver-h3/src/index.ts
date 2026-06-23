import { ArkstackKitDriver, PromiseOrValue } from '@arkstack/contract'
import { H3, H3Event, serve, toResponse } from 'h3'
import { Logger, env } from '@arkstack/common'
import { Middleware, MiddlewareConfig } from './types'

import { Middleware as H3BaseMiddleware } from 'clear-router/types/h3'
import { defaultErrorHandler } from './error-handler'
import ngrok from '@ngrok/ngrok'
import { resolveMiddleware } from '@arkstack/http'
import { staticAssetHandler } from './middlewares'

// oxlint-disable-next-line typescript/no-explicit-any
export type H3Middleware = H3BaseMiddleware | [H3BaseMiddleware, Record<string, any>];

export interface H3DriverOptions {
    bindRouter: (app: H3) => PromiseOrValue<void>;
    mountPublicAssets?: (app: H3, publicPath: string) => PromiseOrValue<void>;
    createApp?: () => H3;
    onError?: (err: Error | string, event: H3Event) => unknown;
}

export class H3EventResponse {
    status: number = 200
    statusText?: string

    constructor(public response: Response) {
        this.status = response.status
        this.statusText = response.statusText
    }

    get headers(): Headers {
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
    createApp(): H3 {
        return this.options.createApp?.() ?? new H3({
            onError: this.options.onError ?? defaultErrorHandler,
        })
    }

    /**
     * Mounts static assets from the specified public path to the H3 application.
     * 
     * @param app 
     * @param publicPath 
     */
    mountPublicAssets(app: H3, publicPath: string): PromiseOrValue<void> {
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
    bindRouter(app: H3): PromiseOrValue<void> {
        return this.options.bindRouter(app)
    }

    /**
     * Applies middleware to the H3 application.
     * 
     * @param app 
     * @param middleware 
     */
    applyMiddleware(
        app: H3,
        middleware: H3Middleware | Middleware | MiddlewareConfig,
    ): void {
        const mw = Array.isArray(middleware) ? middleware[0] : middleware
        const conf = Array.isArray(middleware) && middleware[1] ? middleware[1] : {}

        if (typeof mw === 'function') {
            app.use(resolveMiddleware(mw), conf)

            return
        }

        for (const [pos, entries] of Object.entries(middleware) as [string, (H3Middleware | Middleware)[]][]) {
            for (const entry of entries) {
                const instance = Array.isArray(entry) ? entry[0] : entry
                const conf = Array.isArray(entry) && entry[1] ? entry[1] : {}

                const mw = resolveMiddleware(instance)

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
     * The bind host can be overridden with the `APP_HOST` (or `HOST`) env
     * variable. It defaults to `0.0.0.0` so the server is reachable on all
     * network interfaces, which platforms like Railway require for their
     * healthcheck proxy to reach the app.
     *
     * @param app
     * @param port
     */
    async start(app: H3, port: number): Promise<void> {
        const host = env('APP_HOST', env('HOST', '0.0.0.0'))
        const tunneled = env<boolean>('TUNNEL', false)

        const server = await serve(app, { port, hostname: host, silent: true })
            .ready()

        let log = [
            Logger.log([
                ['Server is running on', 'white'],
                [server.url ?? `http://${host}:${port}`, 'cyan']
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
    }
}

export * from './error-handler'
export * from './Router'

import { ArkstackKitDriver, PromiseOrValue } from '@arkstack/contract'
import { H3, serve, toResponse } from 'h3'
import { H3DriverOptions, H3Middleware, Middleware, MiddlewareConfig } from './types'
import { Logger, devTlsCredentials, env, localNetworkAddress } from '@arkstack/common'

import { defaultErrorHandler } from './error-handler'
import ngrok from '@ngrok/ngrok'
import { resolveMiddleware } from '@arkstack/http'
import { staticAssetHandler } from './middlewares'

/**
 * Build the "Server is running" startup lines, adding a local-network URL when
 * the server is bound to all interfaces (`0.0.0.0`/`::`) so it is reachable from
 * other devices.
 * 
 * @param scheme 
 * @param host 
 * @param port 
 * @returns 
 */
const startupLogLines = (scheme: string, host: string, port: number): string[] => {
    const bindsAll = host === '0.0.0.0' || host === '::'
    const localHost = bindsAll ? 'localhost' : host

    const lines = [
        Logger.log([
            ['Server is running on', 'white'],
            [`${scheme}://${localHost}:${port}`, 'cyan']
        ], ' ', false)
    ]

    if (bindsAll) {
        const address = localNetworkAddress()

        if (address) {
            lines.push(Logger.log([
                ['Network access via', 'white'],
                [`${scheme}://${address}:${port}`, 'cyan']
            ], ' ', false))
        }
    }

    return lines
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
    private tunnel_url?: string
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
     * If trafic has been proxied via ngrok, this will return the tunnel URL.
     * 
     * @returns 
     */
    geTunnelUrl(): string | undefined {
        return this.tunnel_url
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
        const secure = env('APP_SECURE', false) === true
        const tunneled = env('TUNNEL', false)
        const tunnelUrl = env('TUNNEL_URL')
        const scheme = secure ? 'https' : 'http'

        // Dev HTTPS: serve with an in-memory self-signed certificate.
        const tls = secure ? await devTlsCredentials() : undefined

        await serve(app, {
            port,
            hostname: host,
            silent: true,
            ...(tls ? { protocol: 'https', tls: { cert: tls.cert, key: tls.key } } : {}),
        } as never).ready()

        let log = startupLogLines(scheme, host, port)

        if (tunnelUrl) {
            log = log.concat(Logger.log([
                ['Traffic has been tunnelled to', 'white'],
                [tunnelUrl, 'green']
            ], ' ', false))

            this.tunnel_url = tunnelUrl
            globalThis.tunnelUrl = () => tunnelUrl
        } else if (tunneled === true) {
            const listener = await ngrok.forward({
                addr: port,
                authtoken: env('NGROK_AUTHTOKEN'),
                domain: env('NGROK_DOMAIN'),
            })

            const url = listener.url()

            if (url) {
                log = log.concat(Logger.log([
                    ['Traffic has been tunnelled to', 'white'],
                    [url, 'green']
                ], ' ', false))

                process.env.TUNNEL_URL = url
                this.tunnel_url = url
                globalThis.tunnelUrl = () => url
            }
        }

        console.log(log.join('\n'))
    }
}
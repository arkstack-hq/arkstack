import express, { type ErrorRequestHandler, type Express, type Handler } from 'express'

import { ArkstackKitDriver, PromiseOrValue } from '@arkstack/contract'
import { Logger, devTlsCredentials, env, localNetworkAddress } from '@arkstack/common'
import https from 'node:https'
import { defaultErrorHandler } from './error-handler'
import { ExpressDriverOptions, Middleware, MiddlewareConfig } from './types'
import { resolveMiddleware } from '@arkstack/http'
import ngrok from '@ngrok/ngrok'

/**
 * Build the "Server is running" startup lines, adding a local-network URL when
 * the server is bound to all interfaces (`0.0.0.0`/`::`) so it is reachable from
 * other devices.
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

/**
 * The ExpressDriver class implements the ArkstackKitDriver 
 * contract for the Express framework.
 */
export class ExpressDriver extends ArkstackKitDriver<Express, Handler> {
    readonly name = 'express'
    private tunnel_url?: string
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
     * If trafic has been proxied via ngrok, this will return the tunnel URL.
     * 
     * @returns 
     */
    geTunnelUrl(): string | undefined {
        return this.tunnel_url
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
        const secure = env('APP_SECURE', false) === true
        const tunneled = env('TUNNEL', false)
        const tunnelUrl = env('TUNNEL_URL')
        const scheme = secure ? 'https' : 'http'

        const onListen = async () => {
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

        if (secure) {
            // Dev HTTPS: serve with an in-memory self-signed certificate.
            const credentials = await devTlsCredentials()

            https
                .createServer({ key: credentials.key, cert: credentials.cert }, app)
                .listen(port, host, onListen)

            return
        }

        app.listen(port, host, onListen)
    }
}
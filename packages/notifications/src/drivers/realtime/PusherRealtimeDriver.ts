import type { PusherTransportConfig, RealtimeNotificationPayload } from '../../types'
import { RequestException, env } from '@arkstack/common'

import type { RealtimeDriver } from '../../Contracts/RealtimeDriver'

/** The slice of the `pusher` server SDK this driver uses. */
interface PusherClient {
    trigger(channel: string | string[], event: string, data: unknown): Promise<unknown>
    authorizeChannel(
        socketId: string,
        channel: string,
        data?: {
            user_id: string
            user_info?: {
                [key: string]: any
            }
        }
    ): {
        auth: string
        channel_data?: string
        shared_secret?: string
    }
}

type PusherConstructor = new (options: {
    appId: string
    key: string
    secret: string
    cluster: string
    useTLS?: boolean
}) => PusherClient

/**
 * Broadcasts notifications over [Pusher Channels](https://pusher.com/channels).
 *
 * The `pusher` server SDK is an optional peer dependency, imported lazily so the
 * package installs without it; it is only required when this transport is used.
 */
export class PusherRealtimeDriver implements RealtimeDriver {
    private clientPromise?: Promise<PusherClient>

    constructor(private options: PusherTransportConfig = {}) { }

    private client(): Promise<PusherClient> {
        const specifier = 'pusher'
        this.clientPromise ??= (async () => {
            const mod = await import(specifier).catch(() => {
                throw new Error(
                    'The "pusher" package is required for the Pusher realtime transport. Install it with `npm i pusher`.',
                )
            })

            const Pusher = (mod.default ?? mod) as PusherConstructor

            return new Pusher({
                appId: this.options.app_id ?? env('PUSHER_APP_ID', ''),
                key: this.options.key ?? env('PUSHER_KEY', ''),
                secret: this.options.secret ?? env('PUSHER_SECRET', ''),
                cluster: this.options.cluster ?? env('PUSHER_CLUSTER', 'mt1'),
                useTLS: this.options.use_tls ?? true,
            })
        })()

        return this.clientPromise
    }

    async broadcast(channel: string | string[], event: string, payload: RealtimeNotificationPayload) {
        const client = await this.client()

        // Pusher's `trigger` fans out to multiple channels when given an array.
        return await client.trigger(channel, event, payload)
    }

    /**
     * Authourize a pusher channel
     * 
     * @param socketId 
     * @param channel 
     * @returns 
     */
    async auth(
        socketId: string,
        channel: string,
        data?: Parameters<PusherClient['authorizeChannel']>[2]
    ): Promise<ReturnType<PusherClient['authorizeChannel']>> {
        const client = await this.client()

        return client.authorizeChannel(socketId, channel, data)
    }

    /**
     * Register a realtime autorization route
     * 
     * @param authEndpoint 
     * @param middleware 
     * @param config 
     * @param channelPrefix 
     */
    static async registerAuthRoute(
        authEndpoint: string = '/realtime/auth',
        middleware?: unknown | unknown[],
        channelPrefix?: string,
        config: PusherTransportConfig = {},
    ): Promise<void> {
        return new PusherRealtimeDriver(config)
            .registerAuthRoute(authEndpoint, middleware, channelPrefix)
    }

    /**
     * Register a realtime autorization route
     * 
     * @param authEndpoint 
     * @param middleware 
     * @param channelPrefix 
     */
    async registerAuthRoute(
        authEndpoint: string = '/realtime/auth',
        middleware?: unknown | unknown[],
        channelPrefix?: string
    ): Promise<void> {
        const client = await this.client()
        const drivers = {
            express: '@arkstack/driver-express',
            h3: '@arkstack/driver-express'
        }

        for (const [name, path] of Object.entries(drivers)) {
            const midsPath = `${path}/middlewares`
            try {
                const { Router } = await import(path)
                const { auth } = await import(midsPath)

                const middlewares = new Set(Array.isArray(middleware)
                    ? middleware.concat(auth)
                    : [middleware, auth]
                )

                Router.post(authEndpoint, ({ clearRequest, req }: any) => {
                    const channel = clearRequest.input('channel_name')
                    const socketId = clearRequest.input('socket_id')

                    const expected = channelPrefix ??
                        `${config('notifications.drivers.realtime.channel_prefix', 'user.')}${req.user?.id ?? clearRequest.user?.id}`

                    RequestException.abortIf(channel !== expected, 'Channel access denied', 403)

                    return client.authorizeChannel(socketId, channel)
                }).middleware(Array.from(middlewares))

                break
            } catch (e) {
                console.error(
                    `Failed to register auth route for ${name}: ${e instanceof Error ? e.message : e}`
                )
            }
        }
    }
}

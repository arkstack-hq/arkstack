import type { NotificationHandler, PusherClientConfig, RealtimeTransport } from '../types'

/** The slice of the `pusher-js` client this transport uses. */
interface PusherChannel {
    bind(event: string, handler: (data: unknown) => void): void
    unbind(event: string, handler: (data: unknown) => void): void
}

interface PusherClient {
    subscribe(channel: string): PusherChannel
    unsubscribe(channel: string): void
    disconnect(): void
}

type PusherConstructor = new (key: string, options: Record<string, unknown>) => PusherClient

/**
 * Realtime transport backed by [pusher-js](https://github.com/pusher/pusher-js).
 * The SDK is an optional peer dependency imported lazily, so consumers only pull
 * it in when they use the Pusher transport.
 */
export const createPusherTransport = async (config: PusherClientConfig): Promise<RealtimeTransport> => {
    const specifier = 'pusher-js'
    const mod = await import(specifier).catch(() => {
        throw new Error(
            'The "pusher-js" package is required for the Pusher transport. Install it with `npm i pusher-js`.',
        )
    })

    const Pusher = (mod.default ?? mod) as PusherConstructor
    const client = new Pusher(config.key, {
        cluster: config.cluster ?? 'mt1',
        forceTLS: config.forceTLS ?? true,
        authEndpoint: config.authEndpoint,
        auth: config.auth,
    })

    const transport: RealtimeTransport = {
        subscribe(channel: string, event: string, handler: NotificationHandler) {
            const subscription = client.subscribe(channel)
            const listener = (data: unknown) => handler(data as never)

            subscription.bind(event, listener)

            return {
                channel,
                unsubscribe() {
                    subscription.unbind(event, listener)
                    client.unsubscribe(channel)
                },
            }
        },
        disconnect() {
            client.disconnect()
        },
    }

    return transport
}

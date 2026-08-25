import type { PusherClientConfig, RealtimeEventHandler, RealtimeTransport } from '../types'

/** The slice of the `pusher-js` client this transport uses. */
interface PusherChannel {
    bind(event: string, handler: (data: unknown) => void): void
    unbind(event: string, handler: (data: unknown) => void): void
    trigger(event: string, data: unknown): boolean
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
 * 
 * @param config 
 * @returns 
 */
export const createPusherTransport = async (
    config: PusherClientConfig
): Promise<RealtimeTransport> => {
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
        authEndpoint: config.authEndpoint ?? `${config.apiBase}/realtime/auth`,
        auth: config.auth,
    })
    const channels = new Map<string, { channel: PusherChannel, subscriptions: number }>()

    const transport: RealtimeTransport = {
        subscribe(channel: string, event: string, handler: RealtimeEventHandler) {
            const active = channels.get(channel)
            const subscription = active?.channel ?? client.subscribe(channel)
            const listener = (data: unknown) => handler(data as never)

            channels.set(channel, {
                channel: subscription,
                subscriptions: (active?.subscriptions ?? 0) + 1,
            })

            subscription.bind(event, listener)

            return {
                channel,
                unsubscribe() {
                    subscription.unbind(event, listener)
                    const current = channels.get(channel)

                    if (!current || current.subscriptions <= 1) {
                        channels.delete(channel)
                        client.unsubscribe(channel)
                    } else {
                        current.subscriptions--
                    }
                },
            }
        },
        trigger(channel: string, event: string, payload: unknown) {
            const subscription = channels.get(channel)?.channel

            if (!subscription) {
                throw new Error(`Realtime: subscribe to channel "${channel}" before triggering client events`)
            }

            if (!subscription.trigger(event, payload)) {
                throw new Error(`Realtime: failed to trigger client event "${event}" on channel "${channel}"`)
            }
        },
        disconnect() {
            channels.clear()
            client.disconnect()
        },
    }

    return transport
}

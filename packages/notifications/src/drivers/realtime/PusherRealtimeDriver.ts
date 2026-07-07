import type { PusherTransportConfig, RealtimeNotificationPayload } from '../../types'

import type { RealtimeDriver } from '../../Contracts/RealtimeDriver'
import { env } from '@arkstack/common'

/** The slice of the `pusher` server SDK this driver uses. */
interface PusherClient {
    trigger(channel: string | string[], event: string, data: unknown): Promise<unknown>
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
        this.clientPromise ??= (async () => {
            const mod = await import(('pusher')).catch(() => {
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

    async broadcast(channel: string, event: string, payload: RealtimeNotificationPayload) {
        const client = await this.client()

        return await client.trigger(channel, event, payload)
    }
}

import type { NotificationHandler, RealtimeConfig, RealtimeSubscription, RealtimeTransport } from './types'

/**
 * Consumes Arkstack realtime notifications. Resolves a transport (Pusher,
 * Firebase, or an injected one) lazily on first subscribe, and exposes a small
 * channel-oriented API used directly or by the React/Vue bindings.
 */
export class RealtimeClient {
    private transportPromise?: Promise<RealtimeTransport>
    private readonly event: string
    private readonly channelPrefix: string

    constructor(private config: RealtimeConfig = {}) {
        this.event = config.event ?? 'notification'
        this.channelPrefix = config.channelPrefix ?? 'user.'
    }

    /** The channel name a given user's notifications are broadcast on. */
    channelFor (userId: string | number): string {
        return `${this.channelPrefix}${userId}`
    }

    private transport (): Promise<RealtimeTransport> {
        this.transportPromise ??= this.resolveTransport()

        return this.transportPromise
    }

    private async resolveTransport (): Promise<RealtimeTransport> {
        if (this.config.transportFactory) {
            return await this.config.transportFactory()
        }

        if (this.config.transport === 'firebase') {
            if (!this.config.firebase) {
                throw new Error('Realtime: `firebase` config is required for the Firebase transport')
            }

            const { createFirebaseTransport } = await import('./transports/firebase')

            return await createFirebaseTransport(this.config.firebase)
        }

        if (!this.config.pusher) {
            throw new Error('Realtime: `pusher` config is required for the Pusher transport')
        }

        const { createPusherTransport } = await import('./transports/pusher')

        return await createPusherTransport(this.config.pusher)
    }

    /**
     * Subscribe to a channel. Returns a function that unsubscribes.
     *
     * @param channel  The channel name (e.g. `user.7`).
     * @param handler  Called with each incoming notification.
     */
    async subscribe (channel: string, handler: NotificationHandler): Promise<() => void> {
        const transport = await this.transport()
        const subscription: RealtimeSubscription = await transport.subscribe(channel, this.event, handler)

        return () => subscription.unsubscribe()
    }

    /**
     * Subscribe to a user's channel (`{channelPrefix}{userId}`).
     *
     * @param userId   The user id.
     * @param handler  Called with each incoming notification.
     */
    async forUser (userId: string | number, handler: NotificationHandler): Promise<() => void> {
        return await this.subscribe(this.channelFor(userId), handler)
    }

    /** Tear down the underlying transport connection. */
    async disconnect (): Promise<void> {
        if (!this.transportPromise) {
            return
        }

        const transport = await this.transportPromise
        await transport.disconnect()
        this.transportPromise = undefined
    }
}

/** Create a {@link RealtimeClient}. */
export const createRealtime = (config: RealtimeConfig = {}): RealtimeClient => new RealtimeClient(config)

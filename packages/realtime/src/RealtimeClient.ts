import type { NotificationHandler, RealtimeConfig, RealtimeEventHandler, RealtimeSubscription, RealtimeTransport } from './types'

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

    /**
     * The channel name a given user's notifications are broadcast on.
     * 
     * @param userId 
     * @returns 
     */
    channelFor(userId: string | number): string {
        return `${this.channelPrefix}${userId}`
    }

    private transport(): Promise<RealtimeTransport> {
        this.transportPromise ??= this.resolveTransport()

        return this.transportPromise
    }

    private async resolveTransport(): Promise<RealtimeTransport> {
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
    async subscribe(channel: string, handler: NotificationHandler): Promise<() => void> {
        return await this.listen(channel, this.event, handler as RealtimeEventHandler)
    }

    /**
     * Listen for an arbitrary event on a channel.
     *
     * @param channel
     * @param event
     * @param handler
     * @returns
     */
    async listen<Payload = unknown>(
        channel: string,
        event: string,
        handler: RealtimeEventHandler<Payload>,
    ): Promise<() => void> {
        const transport = await this.transport()
        const subscription: RealtimeSubscription = await transport.subscribe(
            channel,
            event,
            handler as RealtimeEventHandler,
        )

        return () => subscription.unsubscribe()
    }

    /**
     * Listen for a client event (`client-{event}`).
     *
     * @param channel
     * @param event
     * @param handler
     * @returns
     */
    async listenForWhisper<Payload = unknown>(
        channel: string,
        event: string,
        handler: RealtimeEventHandler<Payload>,
    ): Promise<() => void> {
        return await this.listen(channel, this.clientEventName(event), handler)
    }

    /**
     * Emit a client event (`client-{event}`) on a subscribed channel.
     *
     * @param channel
     * @param event
     * @param payload
     */
    async whisper<Payload = unknown>(channel: string, event: string, payload: Payload): Promise<void> {
        await this.trigger(channel, this.clientEventName(event), payload)
    }

    /**
     * Emit an event through a transport that supports client-originated events.
     *
     * @param channel
     * @param event
     * @param payload
     */
    async trigger<Payload = unknown>(channel: string, event: string, payload: Payload): Promise<void> {
        const transport = await this.transport()

        if (!transport.trigger) {
            throw new Error('Realtime: the configured transport does not support client events')
        }

        await transport.trigger(channel, event, payload)
    }

    private clientEventName(event: string): string {
        return event.startsWith('client-') ? event : `client-${event}`
    }

    /**
     * Subscribe to a user's channel (`{channelPrefix}{userId}`).
     *
     * @param userId   The user id.
     * @param handler  Called with each incoming notification.
     */
    async forUser(userId: string | number, handler: NotificationHandler): Promise<() => void> {
        return await this.subscribe(this.channelFor(userId), handler)
    }

    /** Tear down the underlying transport connection. */
    async disconnect(): Promise<void> {
        if (!this.transportPromise) {
            return
        }

        const transport = await this.transportPromise
        await transport.disconnect()
        this.transportPromise = undefined
    }
}

/** Create a new {@link RealtimeClient}. */
export const createRealtime = (
    config: RealtimeConfig = {}
): RealtimeClient => new RealtimeClient(config)

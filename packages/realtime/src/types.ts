/**
 * The notification payload delivered to realtime clients. Mirrors the server
 * `RealtimeNotificationPayload` in `@arkstack/notifications` (kept local so the
 * client has no server dependency).
 */
export interface RealtimeNotification {
    id: string
    type: string | null
    title: string
    description: string
    actionText?: string | null
    actionLink?: string | null
    meta?: Record<string, unknown> | null
    read_at: string | null
    created_at: string
}

export type RealtimeTransportName = 'pusher' | 'firebase'

export type NotificationHandler = (notification: RealtimeNotification) => void

/** Handles an arbitrary realtime event payload. */
export type RealtimeEventHandler<Payload = unknown> = (payload: Payload) => void

/** A live subscription to one channel; call `unsubscribe()` to stop listening. */
export interface RealtimeSubscription {
    channel: string
    unsubscribe(): void
}

/**
 * A transport binds a `(channel, event)` to a handler and tears the binding down
 * on `unsubscribe`. Implemented by the built-in Pusher/Firebase transports, or
 * supplied via {@link RealtimeConfig.transportFactory} for custom backends/tests.
 */
export interface RealtimeTransport {
    /**
     * Subscribe to a realtime channel
     *
     * @param channel
     * @param event
     * @param handler
     */
    subscribe(
        channel: string,
        event: string,
        handler: RealtimeEventHandler,
    ): RealtimeSubscription | Promise<RealtimeSubscription>
    /**
     * Emit an event from the connected client, when supported by the transport.
     *
     * @param channel
     * @param event
     * @param payload
     */
    trigger?(
        channel: string,
        event: string,
        payload: unknown,
    ): void | Promise<void>
    /**
     * Disconnect from a connected realtime channel
     */
    disconnect(): void | Promise<void>
}

export interface PusherClientConfig {
    key: string
    cluster?: string
    /** 
     * Your API's base URL, if provisioned, private/presence channels 
     * will be automatically authorized.
     * 
     * Will be ignored if {@link authEndpoint} is provisioned.
     */
    apiBase?: string
    /** 
     * Endpoint that authorizes private/presence channels. 
     * 
     * If provisioned, {@link apiBase} will be ignored.
     */
    authEndpoint?: string
    auth?: { headers?: Record<string, string>, params?: Record<string, string> }
    forceTLS?: boolean
}

export interface FirebaseClientConfig {
    apiKey: string
    projectId: string
    appId: string
    messagingSenderId: string
    /** Realtime Database URL. Uses the Firebase project's default database when omitted. */
    databaseURL?: string
    /** Root path used for ephemeral client events (default `arkstack/client-events`). */
    clientEventsPath?: string
    /** Web push VAPID key used when requesting a messaging token. */
    vapidKey?: string
}

export interface RealtimeConfig {
    transport?: RealtimeTransportName
    /** Event name broadcasts are published under (default `notification`). */
    event?: string
    /** Prefix for the per-user channel (default `user.`), used by `forUser()`. */
    channelPrefix?: string
    pusher?: PusherClientConfig
    firebase?: FirebaseClientConfig
    /** Inject a transport directly — bypasses the built-ins (tests, custom backends). */
    transportFactory?: () => RealtimeTransport | Promise<RealtimeTransport>
}

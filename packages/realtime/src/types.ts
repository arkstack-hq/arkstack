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

/** A live subscription to one channel; call `unsubscribe()` to stop listening. */
export interface RealtimeSubscription {
    channel: string
    unsubscribe (): void
}

/**
 * A transport binds a `(channel, event)` to a handler and tears the binding down
 * on `unsubscribe`. Implemented by the built-in Pusher/Firebase transports, or
 * supplied via {@link RealtimeConfig.transportFactory} for custom backends/tests.
 */
export interface RealtimeTransport {
    subscribe (
        channel: string,
        event: string,
        handler: NotificationHandler,
    ): RealtimeSubscription | Promise<RealtimeSubscription>
    disconnect (): void | Promise<void>
}

export interface PusherClientConfig {
    key: string
    cluster?: string
    /** Endpoint that authorizes private/presence channels. */
    authEndpoint?: string
    auth?: { headers?: Record<string, string>, params?: Record<string, string> }
    forceTLS?: boolean
}

export interface FirebaseClientConfig {
    apiKey: string
    projectId: string
    appId: string
    messagingSenderId: string
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

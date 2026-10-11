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
    /**
     * Stable identity for what this notification is about. A later notification
     * with the same tag supersedes this one rather than stacking beside it — see
     * {@link supersede}, which the React and Vue bindings apply for you.
     */
    tag?: string | null
    /** Removes the notification carrying `tag` instead of displaying anything. */
    retracted?: boolean
    read_at: string | null
    created_at: string
}

/**
 * Client transports, matching the server's `drivers.realtime.transport`.
 *
 * - `pusher`: Pusher Channels, or a self-hosted Pusher-protocol server via `wsHost`.
 * - `firebase`: Firebase Cloud Messaging foreground messages.
 * - `firebase-database`: Firebase Realtime Database channels.
 * - `polling`: nothing is pushed; use {@link RealtimeClient.onPoll} to refetch.
 * - `memory`: an in-process bus, for tests.
 */
export type RealtimeTransportName = 'pusher' | 'firebase' | 'firebase-database' | 'polling' | 'memory'

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
    /**
     * This device's push registration token, when the transport can issue one.
     */
    deviceToken?(options?: DeviceTokenOptions): Promise<string | null>
    /**
     * Set by transports that push nothing; clients should poll this often instead.
     */
    polling?: { interval: number }
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
    /** A self-hosted Pusher-protocol server such as soketi. */
    wsHost?: string
    wsPort?: number
    wssPort?: number
    enabledTransports?: Array<'ws' | 'wss'>
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

export interface DeviceTokenOptions {
    /**
     * The service worker that receives background messages: a registration, or
     * the URL of a script to register. A registered URL receives the Firebase
     * web config as its `firebaseConfig` query parameter. Defaults to Firebase's
     * own `/firebase-messaging-sw.js` lookup.
     */
    serviceWorker?: ServiceWorkerRegistration | string
}

export interface FirebaseDatabaseClientConfig {
    apiKey: string
    projectId: string
    databaseURL: string
    appId?: string
    authDomain?: string
    /** Database path that holds channel events (default `arkstack/channels`). */
    root?: string
    /**
     * Your API's base URL; channels are authorized at `{apiBase}/realtime/auth`.
     * Ignored when {@link authEndpoint} is set.
     */
    apiBase?: string
    /** Endpoint that grants channel access and returns a Firebase custom token. */
    authEndpoint?: string
    auth?: { headers?: Record<string, string> }
}

export interface PollingClientConfig {
    /** How often, in milliseconds, {@link RealtimeClient.onPoll} handlers run (default 5000). */
    interval?: number
}

/**
 * Loads an SDK module (`pusher-js`, `firebase/app`, …) by package specifier.
 * Supply one where bare imports cannot resolve, e.g. a plain `<script>` page
 * that loads the SDKs from a CDN.
 */
export type ModuleImporter = (specifier: string) => Promise<unknown>

export interface RealtimeConfig {
    transport?: RealtimeTransportName
    /** Event name broadcasts are published under (default `notification`). */
    event?: string
    /** Prefix for the per-user channel (default `user.`), used by `forUser()`. */
    channelPrefix?: string
    pusher?: PusherClientConfig
    firebase?: FirebaseClientConfig
    'firebase-database'?: FirebaseDatabaseClientConfig
    polling?: PollingClientConfig
    /** Loads the transport SDKs. Defaults to a dynamic `import()`. */
    importModule?: ModuleImporter
    /** Inject a transport directly — bypasses the built-ins (tests, custom backends). */
    transportFactory?: () => RealtimeTransport | Promise<RealtimeTransport>
}

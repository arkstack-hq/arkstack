import type { FirebaseClientConfig, RealtimeEventHandler, RealtimeTransport } from '../types'

/** The slice of `firebase/messaging` this transport uses. */
interface FirebaseMessagePayload {
    data?: Record<string, string>
}

type OnMessage = (messaging: unknown, next: (payload: FirebaseMessagePayload) => void) => () => void

interface DatabaseReference {
    readonly key?: string | null
}

interface DatabaseSnapshot {
    val(): unknown
}

interface FirebaseClientEvent {
    sender: string
    payload: unknown
}

interface FirebaseDatabaseModule {
    getDatabase(app: unknown, url?: string): unknown
    ref(database: unknown, path: string): DatabaseReference
    onChildAdded(reference: DatabaseReference, handler: (snapshot: DatabaseSnapshot) => void): () => void
    push(reference: DatabaseReference, payload: unknown): Promise<DatabaseReference>
    remove(reference: DatabaseReference): Promise<void>
}

const pathSegment = (value: string): string => encodeURIComponent(value).replace(/\./g, '%2E')

const isFirebaseClientEvent = (value: unknown): value is FirebaseClientEvent => {
    return typeof value === 'object' && value !== null && 'sender' in value && 'payload' in value
}

/**
 * Realtime transport backed by [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging/js/receive)
 * foreground messages. `firebase` is an optional peer dependency imported lazily.
 *
 * FCM delivers to the device (not per-channel), so the channel is informational;
 * messages are matched by `event` and the JSON-encoded payload is parsed back.
 */
export const createFirebaseTransport = async (config: FirebaseClientConfig): Promise<RealtimeTransport> => {
    const appSpecifier = 'firebase/app'
    const messagingSpecifier = 'firebase/messaging'
    const databaseSpecifier = 'firebase/database'

    const [appMod, messagingMod, databaseMod] = await Promise.all([
        import(appSpecifier),
        import(messagingSpecifier),
        import(databaseSpecifier),
    ]).catch(() => {
        throw new Error(
            'The "firebase" package is required for the Firebase transport. Install it with `npm i firebase`.',
        )
    })

    const app = appMod.initializeApp({
        apiKey: config.apiKey,
        projectId: config.projectId,
        appId: config.appId,
        messagingSenderId: config.messagingSenderId,
        databaseURL: config.databaseURL,
    })

    const messaging = messagingMod.getMessaging(app)
    const onMessage = messagingMod.onMessage as OnMessage
    const messageUnsubscribers = new Set<() => void>()
    const databaseUnsubscribers = new Set<() => void>()
    const databaseApi = databaseMod as unknown as FirebaseDatabaseModule
    const database = databaseApi.getDatabase(app, config.databaseURL)
    const clientEventsPath = config.clientEventsPath ?? 'arkstack/client-events'
    const clientId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

    const clientEventReference = (channel: string, event: string): DatabaseReference => databaseApi.ref(
        database,
        `${clientEventsPath}/${pathSegment(channel)}/${pathSegment(event)}`,
    )

    const transport: RealtimeTransport = {
        subscribe(channel: string, event: string, handler: RealtimeEventHandler) {
            const off = onMessage(messaging, (payload) => {
                if (payload.data?.event !== event || !payload.data.payload) {
                    return
                }

                try {
                    handler(JSON.parse(payload.data.payload))
                } catch {
                    /** Ignore malformed payloads. */
                }
            })
            messageUnsubscribers.add(off)
            const offClientEvent = event.startsWith('client-')
                ? databaseApi.onChildAdded(clientEventReference(channel, event), (snapshot) => {
                    const clientEvent = snapshot.val()

                    if (isFirebaseClientEvent(clientEvent) && clientEvent.sender !== clientId) {
                        handler(clientEvent.payload)
                    }
                })
                : undefined

            if (offClientEvent) {
                databaseUnsubscribers.add(offClientEvent)
            }

            return {
                channel,
                unsubscribe() {
                    off()
                    messageUnsubscribers.delete(off)
                    if (offClientEvent) {
                        offClientEvent()
                        databaseUnsubscribers.delete(offClientEvent)
                    }
                },
            }
        },
        async trigger(channel: string, event: string, payload: unknown) {
            const eventReference = await databaseApi.push(clientEventReference(channel, event), {
                sender: clientId,
                payload,
            })

            await databaseApi.remove(eventReference)
        },
        disconnect() {
            messageUnsubscribers.forEach((off) => off())
            messageUnsubscribers.clear()
            databaseUnsubscribers.forEach((off) => off())
            databaseUnsubscribers.clear()
        },
    }

    return transport
}

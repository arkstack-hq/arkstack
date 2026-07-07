import type { FirebaseClientConfig, NotificationHandler, RealtimeTransport } from '../types'

/** The slice of `firebase/messaging` this transport uses. */
interface FirebaseMessagePayload {
    data?: Record<string, string>
}

type OnMessage = (messaging: unknown, next: (payload: FirebaseMessagePayload) => void) => () => void

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

    const [appMod, messagingMod] = await Promise.all([
        import(appSpecifier),
        import(messagingSpecifier),
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
    })

    const messaging = messagingMod.getMessaging(app)
    const onMessage = messagingMod.onMessage as OnMessage

    const transport: RealtimeTransport = {
        subscribe(channel: string, event: string, handler: NotificationHandler) {
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

            return { channel, unsubscribe: off }
        },
        disconnect() { },
    }

    return transport
}

import type { FirebaseTransportConfig, RealtimeNotificationPayload } from '../../types'

import type { RealtimeDriver } from '../../Contracts/RealtimeDriver'
import { env } from '@arkstack/common'

/** The slice of the `firebase-admin` messaging API this driver uses. */
interface FirebaseMessaging {
    send(message: { topic: string, data: Record<string, string> }): Promise<string>
}

/**
 * Broadcasts notifications over [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
 * topics (the channel name maps to an FCM topic).
 *
 * `firebase-admin` is an optional peer dependency, imported lazily so the
 * package installs without it; it is only required when this transport is used.
 * FCM data values must be strings, so the payload is JSON-encoded.
 */
export class FirebaseRealtimeDriver implements RealtimeDriver {
    private messagingPromise?: Promise<FirebaseMessaging>

    constructor(private options: FirebaseTransportConfig = {}) { }

    private messaging(): Promise<FirebaseMessaging> {
        this.messagingPromise ??= (async () => {
            const [app, messaging] = await Promise.all([
                import(('firebase-admin/app')),
                import(('firebase-admin/messaging')),
            ]).catch(() => {
                throw new Error(
                    'The "firebase-admin" package is required for the Firebase realtime transport. Install it with `npm i firebase-admin`.',
                )
            })

            const credential = app.cert({
                projectId: this.options.project_id ?? env('FIREBASE_PROJECT_ID', ''),
                clientEmail: this.options.client_email ?? env('FIREBASE_CLIENT_EMAIL', ''),
                // Env-stored keys keep literal "\n"; restore real newlines.
                privateKey: (this.options.private_key ?? env('FIREBASE_PRIVATE_KEY', ''))?.replace(/\\n/g, '\n'),
            })

            // Reuse a named app so repeated broadcasts don't re-initialize.
            const name = 'arkstack-realtime'
            const existing = app.getApps().find((a: { name: string }) => a.name === name)
            const instance = existing ?? app.initializeApp({ credential }, name)

            return messaging.getMessaging(instance)
        })()

        return this.messagingPromise
    }

    async broadcast(channel: string, event: string, payload: RealtimeNotificationPayload) {
        const messaging = await this.messaging()

        // FCM topic names allow only `[a-zA-Z0-9-_.~%]`.
        const topic = channel.replace(/[^a-zA-Z0-9-_.~%]/g, '_')

        return await messaging.send({
            topic,
            data: { event, payload: JSON.stringify(payload) },
        })
    }
}

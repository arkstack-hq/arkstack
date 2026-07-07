import type { FirebaseTransportConfig, RealtimeNotificationPayload } from '../../types'
import { existsSync, readFileSync } from 'node:fs'

import type { RealtimeDriver } from '../../Contracts/RealtimeDriver'
import { env } from '@arkstack/common'
import path from 'node:path'

/** The slice of the `firebase-admin` messaging API this driver uses. */
interface FirebaseSendResponse {
    success: boolean
    error?: { code?: string }
}

interface FirebaseMessaging {
    send(message: { topic: string, data: Record<string, string> }): Promise<string>
    sendEachForMulticast(message: { tokens: string[], data: Record<string, string> }): Promise<{
        successCount: number
        failureCount: number
        responses: FirebaseSendResponse[]
    }>
}

/** FCM caps a multicast at 500 tokens per call. */
const MULTICAST_LIMIT = 500

/** Error codes that mean a token is dead and should be pruned by the app. */
const DEAD_TOKEN_CODES = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
    'messaging/invalid-argument',
])

/** 
 * The outcome of a token multicast: totals plus the tokens FCM rejected as dead. 
 */
export interface FirebaseMulticastResult {
    successCount: number
    failureCount: number
    /** 
     * Tokens FCM reported as unregistered/invalid — delete these from your store. 
     */
    invalidTokens: string[]
}

/**
 * Broadcasts notifications over [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging).
 * A single channel maps to an FCM topic; an array of channels is treated as
 * device registration tokens and delivered via a multicast send (chunked to
 * FCM's 500-token limit), returning the tokens that should be pruned.
 *
 * `firebase-admin` is an optional peer dependency, imported lazily so the
 * package installs without it; it is only required when this transport is used.
 * FCM data values must be strings, so the payload is JSON-encoded.
 */
export class FirebaseRealtimeDriver implements RealtimeDriver {
    private messagingPromise?: Promise<FirebaseMessaging>

    constructor(private options: FirebaseTransportConfig = {}) { }

    private messaging(): Promise<FirebaseMessaging> {
        const appSpecifier = 'firebase-admin/app'
        const messagingSpecifier = 'firebase-admin/messaging'

        this.messagingPromise ??= (async () => {
            const [app, messaging] = await Promise.all([
                import(appSpecifier),
                import(messagingSpecifier),
            ]).catch(() => {
                throw new Error(
                    'The "firebase-admin" package is required for the Firebase realtime transport. Install it with `npm i firebase-admin`.',
                )
            })

            const adminsdk = path.join(
                process.cwd(),
                this.options.admin_sdk_path ?? env('FIREBASE_ADMINSDK', 'firebase-adminsdk.json')
            )

            let serviceAccount: Record<string, any> | undefined
            try {
                if (existsSync(adminsdk))
                    serviceAccount = JSON.parse(readFileSync(adminsdk, { encoding: 'utf-8' }))
            } catch {/** */ }

            const credential = app.cert(serviceAccount ?? {
                projectId: this.options.project_id ?? env('FIREBASE_PROJECT_ID', ''),
                clientEmail: this.options.client_email ?? env('FIREBASE_CLIENT_EMAIL', ''),
                // Env-stored keys keep literal "\n"; restore real newlines.
                privateKey: (this.options.private_key ?? env('FIREBASE_PRIVATE_KEY', ''))?.replace(/\\n/g, '\n'),
            })

            // Reuse a named app so repeated broadcasts don't re-initialize.
            const name = String(
                this.options.app_name ?? env('FIREBASE_APP_NAME', 'arkstack-realtime')
            ).replaceAll(' ', '-').toLowerCase()
            const existing = app.getApps().find((a: { name: string }) => a.name === name)
            const instance = existing ?? app.initializeApp({ credential }, name)

            return messaging.getMessaging(instance)
        })()

        return this.messagingPromise
    }

    async broadcast(channel: string | string[], event: string, payload: RealtimeNotificationPayload) {
        const messaging = await this.messaging()
        const data = { event, payload: JSON.stringify(payload) }

        // An array of channels = device registration tokens → multicast.
        if (Array.isArray(channel)) {
            return await this.multicast(messaging, channel, data)
        }

        // FCM topic names allow only `[a-zA-Z0-9-_.~%]`.
        const topic = channel.replace(/[^a-zA-Z0-9-_.~%]/g, '_')

        return await messaging.send({ topic, data })
    }

    /**
     * Send to many device tokens at once, chunked to FCM's 500-token limit, and
     * collect the tokens FCM rejects as dead so the caller can prune them.
     */
    private async multicast(
        messaging: FirebaseMessaging,
        tokens: string[],
        data: Record<string, string>,
    ): Promise<FirebaseMulticastResult> {
        const result: FirebaseMulticastResult = { successCount: 0, failureCount: 0, invalidTokens: [] }

        for (let i = 0; i < tokens.length; i += MULTICAST_LIMIT) {
            const batch = tokens.slice(i, i + MULTICAST_LIMIT)
            const response = await messaging.sendEachForMulticast({ tokens: batch, data })

            result.successCount += response.successCount
            result.failureCount += response.failureCount

            response.responses.forEach((res, index) => {
                if (!res.success && res.error?.code && DEAD_TOKEN_CODES.has(res.error.code)) {
                    result.invalidTokens.push(batch[index])
                }
            })
        }

        return result
    }
}

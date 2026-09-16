import type { FirebaseTransportConfig, RealtimeBroadcastPayload, RealtimeDeliveryOptions } from '../../types'
import { existsSync, readFileSync } from 'node:fs'

import type { RealtimeDriver } from '../../Contracts/RealtimeDriver'
import { env } from '@arkstack/common'
import path from 'node:path'

/** The slice of the `firebase-admin` messaging API this driver uses. */
interface FirebaseSendResponse {
    success: boolean
    error?: { code?: string }
}

/**
 * The platform blocks FCM accepts alongside `data`. Typed as open records on
 * purpose — the admin SDK's own config types are far richer than this driver
 * models, and keeping these loose lets a caller pass anything FCM supports
 * without this slice having to track the SDK version for version.
 */
interface FirebaseMessageOverrides {
    android?: Record<string, unknown>
    apns?: Record<string, unknown>
    webpush?: Record<string, unknown>
}

interface FirebaseMessaging {
    send(message: { topic: string, data: Record<string, string> } & FirebaseMessageOverrides): Promise<string>
    sendEachForMulticast(
        message: { tokens: string[], data: Record<string, string> } & FirebaseMessageOverrides,
    ): Promise<{
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

    async broadcast(
        channel: string | string[],
        event: string,
        payload: RealtimeBroadcastPayload,
        delivery?: RealtimeDeliveryOptions,
    ) {
        const messaging = await this.messaging()
        const data = { event, payload: JSON.stringify(payload) }
        const overrides = this.overridesFor(delivery)

        // An array of channels = device registration tokens → multicast.
        if (Array.isArray(channel)) {
            return await this.multicast(messaging, channel, data, overrides)
        }

        // FCM topic names allow only `[a-zA-Z0-9-_.~%]`.
        const topic = channel.replace(/[^a-zA-Z0-9-_.~%]/g, '_')

        return await messaging.send({ topic, data, ...overrides })
    }

    /**
     * Translate transport-agnostic delivery hints into FCM's platform blocks.
     *
     * Per-send options win over the transport defaults, and the raw `android` /
     * `apns` / `webpush` escape hatches are merged last so a caller can always
     * override what this derives.
     *
     * `priority` always maps to Android and Web Push. Whether it maps to APNs
     * depends on the message rather than on the platform: Apple requires a
     * background push to be priority 5 or 1, and a data-only message — what this
     * driver sends by default — arrives on iOS as exactly that. So the header is
     * derived only once the message is demonstrably a *visible* push, which a
     * caller declares through the `apns` escape hatch. Guessing otherwise would
     * mean sending APNs something it is documented to reject.
     * 
     * @param delivery 
     * @returns 
     */
    private overridesFor(delivery?: RealtimeDeliveryOptions): FirebaseMessageOverrides {
        const base = this.options.delivery ?? {}
        const merged: RealtimeDeliveryOptions = {
            ...base,
            ...delivery,
            android: { ...base.android, ...delivery?.android },
            apns: { ...base.apns, ...delivery?.apns },
            webpush: { ...base.webpush, ...delivery?.webpush },
        }

        const android: Record<string, unknown> = {}
        const apnsHeaders: Record<string, string> = {}
        const webpushHeaders: Record<string, string> = {}

        if (merged.priority) {
            android.priority = merged.priority
            webpushHeaders.Urgency = merged.priority

            // APNs takes a priority only where one is legal — see `isVisiblePush`.
            if (this.isVisiblePush(merged.apns)) {
                apnsHeaders['apns-priority'] = merged.priority === 'high' ? '10' : '5'
            }
        }

        if (merged.collapseKey) {
            android.collapseKey = merged.collapseKey
            apnsHeaders['apns-collapse-id'] = merged.collapseKey
        }

        if (typeof merged.ttl === 'number') {
            // The admin SDK takes an Android TTL as a duration in milliseconds …
            android.ttl = merged.ttl * 1000
            // … while apns-expiration is an absolute UNIX second, and 0 means
            // now-or-never rather than "expires at the epoch".
            apnsHeaders['apns-expiration'] = merged.ttl === 0
                ? '0'
                : String(Math.floor(Date.now() / 1000) + merged.ttl)
            // Web Push TTL is a duration in seconds.
            webpushHeaders.TTL = String(merged.ttl)
        }

        return {
            // Android carries its settings flat on the block …
            ...this.flatBlock('android', android, merged.android),
            // … while APNs and Web Push nest theirs under `headers`.
            ...this.headerBlock('apns', apnsHeaders, merged.apns),
            ...this.headerBlock('webpush', webpushHeaders, merged.webpush),
        }
    }

    /**
     * Whether the caller has built a push iOS will actually display.
     *
     * Apple allows `apns-priority: 10` only on a push that shows the user
     * something; a background push must be 5 or 1. A data-only message is a
     * background push, so this is false for the default this driver sends, and
     * true once a caller has declared an alert through the `apns` escape hatch —
     * by push type, or by supplying an alert payload.
     *
     * @param apns
     * @returns
     */
    private isVisiblePush(apns: Record<string, unknown> | undefined): boolean {
        const headers = apns?.headers as Record<string, string> | undefined
        const aps = (apns?.payload as { aps?: Record<string, unknown> } | undefined)?.aps

        return headers?.['apns-push-type'] === 'alert' || aps?.alert !== undefined
    }

    /**
     * Fold a caller's raw override over the derived settings, dropping the block
     * entirely when neither contributed anything.
     * 
     * @param key 
     * @param derived 
     * @param override 
     * @returns 
     */
    private flatBlock(
        key: 'android',
        derived: Record<string, unknown>,
        override: Record<string, unknown> | undefined,
    ): FirebaseMessageOverrides {
        const block = { ...derived, ...override }

        return Object.keys(block).length > 0 ? { [key]: block } : {}
    }

    /**
     * As `flatBlock`, but for the platforms whose settings live under `headers` —
     * merged key by key, so an override adding one header keeps the rest.
     * 
     * @param key 
     * @param derived 
     * @param override 
     * @returns 
     */
    private headerBlock(
        key: 'apns' | 'webpush',
        derived: Record<string, string>,
        override: Record<string, unknown> | undefined,
    ): FirebaseMessageOverrides {
        const { headers: overrideHeaders, ...rest } = (override ?? {}) as { headers?: Record<string, string> }
        const headers = { ...derived, ...overrideHeaders }
        const block: Record<string, unknown> = { ...rest }

        if (Object.keys(headers).length > 0) {
            block.headers = headers
        }

        return Object.keys(block).length > 0 ? { [key]: block } : {}
    }

    /**
     * Firebase channels do not require server-side authorization.
     * 
     * @param _socketId 
     * @param _channel 
     * @param _data 
     */
    async auth(_socketId: string, _channel: string, _data?: unknown): Promise<void> { }

    /** 
     * Firebase does not require an authorization route.
     * 
     * @param _authEndpoint 
     * @param _middleware 
     * @param _channelPrefix 
     * @param _config 
     */
    static async registerAuthRoute(
        _authEndpoint: string = '/realtime/auth',
        _middleware?: unknown | unknown[],
        _channelPrefix?: string,
        _config: FirebaseTransportConfig = {},
    ): Promise<void> { }

    /** 
     * Firebase does not require an authorization route.
     * 
     * @param _authEndpoint 
     * @param _middleware 
     * @param _channelPrefix 
     */
    async registerAuthRoute(
        _authEndpoint: string = '/realtime/auth',
        _middleware?: unknown | unknown[],
        _channelPrefix?: string,
    ): Promise<void> { }

    /**
     * Send to many device tokens at once, chunked to FCM's 500-token limit, and
     * collect the tokens FCM rejects as dead so the caller can prune them.
     */
    private async multicast(
        messaging: FirebaseMessaging,
        tokens: string[],
        data: Record<string, string>,
        overrides: FirebaseMessageOverrides = {},
    ): Promise<FirebaseMulticastResult> {
        const result: FirebaseMulticastResult = { successCount: 0, failureCount: 0, invalidTokens: [] }

        for (let i = 0; i < tokens.length; i += MULTICAST_LIMIT) {
            const batch = tokens.slice(i, i + MULTICAST_LIMIT)
            const response = await messaging.sendEachForMulticast({
                tokens: batch,
                data,
                ...overrides
            })

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

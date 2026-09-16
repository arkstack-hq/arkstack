import type {
    DbNotificationPayload,
    DbNotificationType,
    NotificationData,
    NotificationRecipient,
    RealtimeBroadcastResult,
    RealtimeDeliveryOptions,
    RealtimeDriverName,
    RealtimeDriverOptions,
    RealtimeNotificationPayload,
} from '../types'

import { FirebaseRealtimeDriver } from './realtime/FirebaseRealtimeDriver'
import { NotificationContract } from '../Contracts/NotificationContract'
import { PusherRealtimeDriver } from './realtime/PusherRealtimeDriver'
import type { RealtimeDriver, RealtimeNotificationDriver } from '../Contracts/RealtimeDriver'
import type { User } from '@app/models/User'
import { UserNotificationCenter } from '../UserNotificationCenter'
import { configure } from '../config'
import { interpolate } from '../utils/template'
import { randomUUID } from 'node:crypto'

/**
 * Broadcasts a notification to connected clients over a realtime transport
 * (Pusher or Firebase). The notification is delivered on a per-user channel and,
 * when `store` is enabled, is also persisted so the client can load history.
 */
export class RealtimeNotification
    <T extends RealtimeDriverName = RealtimeDriverName> extends NotificationContract<RealtimeBroadcastResult> {
    /**
     * The underlying transport. Assignable, and configurable up front through
     * `driverFactory`, so a transport this package does not ship — or a fake in a
     * test — can stand in for the built-ins.
     */
    driver: RealtimeNotificationDriver<T>
    private user?: User
    private channelName?: string | string[]
    private eventName: string
    private channelPrefix: string
    private shouldStore: boolean
    private tagName?: string
    private isRetraction = false
    private deliveryOptions: RealtimeDeliveryOptions
    private payload: Partial<DbNotificationPayload> = {}

    constructor(options: RealtimeDriverOptions<T> = {}) {
        super()

        const driverConfig = configure('drivers.realtime', {}) as {
            transport?: RealtimeDriverName
            channel_prefix?: string
            event?: string
            store?: boolean
            delivery?: RealtimeDeliveryOptions
            driverFactory?: () => RealtimeDriver
        }
        const transport = options.transport ?? driverConfig?.transport ?? 'pusher'
        const transportConfig = configure(`transports.${transport}` as never, {}) as Record<string, never>

        this.channelName = options.channel
        this.eventName = options.event ?? driverConfig?.event ?? 'notification'
        this.channelPrefix = driverConfig?.channel_prefix ?? 'user.'
        this.shouldStore = options.store ?? driverConfig?.store ?? false
        this.deliveryOptions = { ...driverConfig?.delivery, ...options.delivery }

        // A supplied driver wins over `transport`: naming one of the built-ins is
        // meaningless when the caller is bringing their own.
        const factory = options.driverFactory ?? driverConfig?.driverFactory

        this.driver = (factory
            ? factory()
            : transport === 'firebase'
                ? new FirebaseRealtimeDriver({ ...transportConfig, ...options.firebase })
                : new PusherRealtimeDriver({ ...transportConfig, ...options.pusher })
        ) as RealtimeNotificationDriver<T>
    }

    from(_: string): this {
        return this
    }

    subject(subject: string): this {
        this.payload.title = subject

        return this
    }

    /**
     * Overide the default transport
     * 
     * @param transport 
     * @param options 
     * @returns 
     */
    transport(transport: T, options?: RealtimeDriverOptions[T]): this {
        const transportConfig = configure(`transports.${transport}` as never, {}) as Record<string, never>

        this.driver = (transport === 'firebase'
            ? new FirebaseRealtimeDriver({ ...transportConfig, ...options as any })
            : new PusherRealtimeDriver({ ...transportConfig, ...options as any })
        ) as RealtimeNotificationDriver<T>

        return this
    }

    /**
     * Set the recipient: a `User` (derives the channel), an explicit channel
     * string, or an array of channels (Pusher) / device tokens (Firebase).
     *
     * @param recipient
     * @returns
     */
    recipient(recipient: NotificationRecipient | User): this {
        if (typeof recipient === 'object' && !Array.isArray(recipient) && typeof recipient.id !== 'undefined') {
            this.user = recipient

            return this
        }

        if (typeof recipient === 'string' || Array.isArray(recipient)) {
            this.channelName = recipient

            return this
        }

        throw new Error('Realtime notifications require a user recipient or a channel name')
    }

    /**
     * Broadcast on an explicit channel/topic instead of the per-user default.
     * An array broadcasts to multiple Pusher channels, or — for Firebase — to a
     * list of device registration tokens (multicast).
     *
     * @param channel
     * @returns
     */
    channel(channel: string): this
    channel(channel: string[]): this
    channel(channel: string | string[]): this {
        this.channelName = channel

        return this
    }

    /**
     * The event name clients subscribe to (default `notification`). 
     * 
     * @param channel 
     * @returns 
     */
    event(event: string): this {
        this.eventName = event

        return this
    }

    /**
     * Also persist the notification (requires a `User` recipient). 
     * 
     * @param channel 
     * @returns 
     */
    store(store = true): this {
        this.shouldStore = store

        return this
    }

    type(type?: DbNotificationType | null): this {
        this.payload.type = type

        return this
    }

    action(text?: string | null, link?: string | null): this {
        this.payload.actionText = text
        this.payload.actionLink = link

        return this
    }

    meta(meta?: NotificationData | null): this {
        this.payload.meta = meta

        return this
    }

    /**
     * How hard the transport should work to deliver this message.
     *
     * FCM sends a data message at normal priority by default, and Doze and App
     * Standby may hold a normal-priority message until the next maintenance
     * window — which is precisely the state a phone is in when something needs to
     * wake it. `high` is what exempts the message.
     *
     * FCM budgets high-priority sends, so reserve it for messages the user is
     * actually waiting on. Pusher ignores this.
     *
     * @param priority
     * @returns
     */
    priority(priority: 'normal' | 'high' = 'high'): this {
        this.deliveryOptions.priority = priority

        return this
    }

    /**
     * How long, in seconds, this message is still worth delivering.
     *
     * FCM keeps a message for four weeks by default. Anything time-critical wants
     * far less — a signal that arrives after the moment has passed is worse than
     * one that never arrives — so pair a short TTL with `priority('high')`. `0`
     * means deliver now or drop it.
     *
     * @param seconds
     * @returns
     */
    ttl(seconds: number): this {
        this.deliveryOptions.ttl = seconds

        return this
    }

    /**
     * Supersede an earlier undelivered message instead of stacking beside it.
     * Key it by the thing being signalled — an approval id, say — so a repeat replaces
     * the message it repeats.
     *
     * @param key
     * @returns
     */
    collapseKey(key: string): this {
        this.deliveryOptions.collapseKey = key

        return this
    }

    /**
     * Merge raw delivery options, including the per-platform `android` / `apns` /
     * `webpush` escape hatches for anything the helpers above do not cover.
     *
     * @param delivery
     * @returns
     */
    delivery(delivery: RealtimeDeliveryOptions): this {
        this.deliveryOptions = { ...this.deliveryOptions, ...delivery }

        return this
    }

    /**
     * Give this notification a stable identity, so a later one can supersede it.
     *
     * Tag by the thing the notification is *about* — `order:42`, `incident:7` —
     * not by the message. A client that already showed a notification with this
     * tag replaces it in place instead of stacking a second one beside it.
     *
     * This is a client-side identity and is deliberately **not** wired to
     * `collapseKey`: a collapse key is a transport queue slot, and FCM keeps only
     * four per device, so auto-deriving one per tag would quietly evict others.
     * When you want both — supersede what is queued *and* what was displayed —
     * set both to the same value.
     *
     * @param tag
     * @returns
     */
    tag(tag: string): this {
        this.tagName = tag

        return this
    }

    /**
     * Send an instruction to remove the notification carrying this tag, rather
     * than a notification to display. Nothing is persisted, even under `store()`.
     *
     * Reach for this only when there is genuinely nothing left to say. Where the
     * outcome has its own content — an approval answered elsewhere, a check that
     * went from failing to passing — supersede it by sending that content under
     * the same `tag()`. A replacement travels as an ordinary notification, while a
     * retraction has nothing to display and so must travel silently, which is
     * exactly what Doze, App Standby and iOS throttle hardest.
     *
     * @param retract
     * @returns
     */
    retract(retract = true): this {
        this.isRetraction = retract

        return this
    }

    private resolveChannel(): string | string[] {
        if (this.channelName !== undefined) {
            return this.channelName
        }

        if (this.user) {
            return `${this.channelPrefix}${this.user.id}`
        }

        throw new Error('No channel resolved for realtime notification (provide a user or channel)')
    }

    /**
     * Send a realtime notification using the default realtime driver
     * 
     * @param message 
     * @param subject 
     * @param _recipient 
     * @param data 
     * @returns 
     */
    async send(
        // Optional so a retraction, which displays nothing, can `send()` bare.
        message: string = '',
        subject?: string,
        _recipient?: NotificationRecipient,
        data?: NotificationData,
    ): Promise<RealtimeBroadcastResult> {
        const channel = this.resolveChannel()
        const mergedData = this.mergeData(data)

        const base: DbNotificationPayload = {
            type: this.payload.type ?? null,
            title: interpolate(subject ?? this.payload.title ?? '', mergedData),
            description: interpolate(message, mergedData),
            actionText: this.payload.actionText ?? null,
            actionLink: this.payload.actionLink ?? null,
            meta: this.payload.meta ?? null,
        }

        // Opt-in persistence gives the payload a real id + timestamps and lets the
        // client load history alongside the live broadcast.
        // A retraction withdraws a notification; storing one as a notification in
        // its own right would leave the history saying the opposite of the truth.
        const stored = this.shouldStore && this.user && !this.isRetraction
            ? await UserNotificationCenter.create(this.user, base)
            : undefined

        const payload: RealtimeNotificationPayload = {
            id: stored ? String(stored.id) : randomUUID(),
            type: base.type ?? null,
            title: base.title,
            description: base.description,
            actionText: base.actionText ?? null,
            actionLink: base.actionLink ?? null,
            meta: base.meta ?? null,
            // Both are omitted rather than nulled when unused, so an untagged
            // broadcast stays byte-for-byte what it has always been on the wire.
            ...(this.tagName !== undefined ? { tag: this.tagName } : {}),
            ...(this.isRetraction ? { retracted: true } : {}),
            read_at: stored?.readAt ? new Date(stored.readAt).toISOString() : null,
            created_at: stored?.createdAt ? new Date(stored.createdAt).toISOString() : new Date().toISOString(),
        }

        if (channel && channel.length > 0)
            await this.driver.broadcast(channel, this.eventName, payload, this.deliveryOptions)

        return { channel, event: this.eventName, payload, stored }
    }
}

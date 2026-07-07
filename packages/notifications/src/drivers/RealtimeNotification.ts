import type {
    DbNotificationPayload,
    DbNotificationType,
    NotificationData,
    NotificationRecipient,
    RealtimeBroadcastResult,
    RealtimeDriverName,
    RealtimeDriverOptions,
    RealtimeNotificationPayload,
} from '../types'

import { FirebaseRealtimeDriver } from './realtime/FirebaseRealtimeDriver'
import { NotificationContract } from '../Contracts/NotificationContract'
import { PusherRealtimeDriver } from './realtime/PusherRealtimeDriver'
import type { RealtimeDriver } from '../Contracts/RealtimeDriver'
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
export class RealtimeNotification extends NotificationContract<RealtimeBroadcastResult> {
    /** 
     * The underlying transport; assignable so tests can inject a fake. 
     */
    driver: RealtimeDriver
    private user?: User
    private channelName?: string
    private eventName: string
    private channelPrefix: string
    private shouldStore: boolean
    private payload: Partial<DbNotificationPayload> = {}

    constructor(options: RealtimeDriverOptions = {}) {
        super()

        const driverConfig = configure('drivers.realtime', {}) as {
            transport?: RealtimeDriverName
            channel_prefix?: string
            event?: string
            store?: boolean
        }
        const transport = options.transport ?? driverConfig?.transport ?? 'pusher'
        const transportConfig = configure(`transports.${transport}` as never, {}) as Record<string, never>

        this.channelName = options.channel
        this.eventName = options.event ?? driverConfig?.event ?? 'notification'
        this.channelPrefix = driverConfig?.channel_prefix ?? 'user.'
        this.shouldStore = options.store ?? driverConfig?.store ?? false

        this.driver = transport === 'firebase'
            ? new FirebaseRealtimeDriver({ ...transportConfig, ...options.firebase })
            : new PusherRealtimeDriver({ ...transportConfig, ...options.pusher })
    }

    from(_from: string): this {
        return this
    }

    subject(subject: string): this {
        this.payload.title = subject

        return this
    }

    /** 
     * Set the recipient: a `User` (derives the channel) or an explicit channel string. 
     * 
     * @param recipient 
     * @returns 
     */
    recipient(recipient: NotificationRecipient | User): this {
        if (typeof recipient === 'object' && !Array.isArray(recipient) && typeof recipient.id !== 'undefined') {
            this.user = recipient

            return this
        }

        if (typeof recipient === 'string') {
            this.channelName = recipient

            return this
        }

        throw new Error('Realtime notifications require a user recipient or a channel name')
    }

    /**
     * Broadcast on an explicit channel/topic instead of the per-user default. 
      * 
      * @param channel 
      * @returns 
      */
    channel(channel: string): this {
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

    type(type: DbNotificationType | null): this {
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

    private resolveChannel(): string {
        if (this.channelName) {
            return this.channelName
        }

        if (this.user) {
            return `${this.channelPrefix}${this.user.id}`
        }

        throw new Error('No channel resolved for realtime notification (provide a user or channel)')
    }

    async send(
        message: string,
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
        const stored = this.shouldStore && this.user
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
            read_at: stored?.readAt ? new Date(stored.readAt).toISOString() : null,
            created_at: stored?.createdAt ? new Date(stored.createdAt).toISOString() : new Date().toISOString(),
        }

        await this.driver.broadcast(channel, this.eventName, payload)

        return { channel, event: this.eventName, payload, stored }
    }
}

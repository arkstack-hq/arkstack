import type { TransportOptions, Transporter } from 'nodemailer'

import type { Logger } from 'nodemailer/lib/shared'
import MailMessage from 'nodemailer/lib/mailer/mail-message'
import type { MergedConfig } from '@arkstack/common'
import type { RealtimeDriver } from './Contracts/RealtimeDriver'
import type { UserNotification } from '@app/models/UserNotification'

export type NotificationRecipient = string | string[]

export type MailRecipientAddress = Record<string, string>

export type MailRecipient = string | MailRecipientAddress | Array<string | MailRecipientAddress>

export type NotificationData = Record<string, unknown>

export type SmsDriverName = 'africastalking' | 'twilio'

export type RealtimeDriverName = 'pusher' | 'firebase'

export type NotificationChannel = 'mail' | 'sms' | 'db' | 'realtime'

export interface Transport<T = any, D extends TransportOptions = TransportOptions> {
    mailer?: Transporter<T, D> | undefined;

    name: string;
    version: string;

    send(mail: MailMessage<T>, callback: (err: Error | null, info: T) => void): void;

    verify?(callback: (err: Error | null, success: true) => void): void;
    verify?(): Promise<true>;

    close?(): void;
}

export type MailDriverOptions = {
    transport?: 'file' | 'smtp' | 'sendmail' | 'ses'
    url?: string
    host?: string
    port?: number
    user?: string
    pass?: string
    from?: string
    debug?: boolean
    logger?: boolean | Logger
    secure?: boolean
    service?: string
    sesRegion?: string
    directory?: string
    ignoreTLS?: boolean
    requireTLS?: boolean
    authMethod?: 'PLAIN' | 'LOGIN' | 'CRAM-MD5'
    testAddress?: string
    sendmailArgs?: string[]
    sendmailPath?: string
    transactionLog?: boolean
}

export type SmsDriverOptions = {
    transport?: SmsDriverName
    from?: string
    africastalking?: {
        username?: string
        apiKey?: string
        senderId?: string
    }
    twilio?: {
        accountSid?: string
        authToken?: string
        from?: string
    }
}

export type PusherTransportConfig = {
    app_id?: string
    key?: string
    secret?: string
    cluster?: string
    use_tls?: boolean
}

export type FirebaseTransportConfig = {
    project_id?: string
    client_email?: string
    private_key?: string
    app_name?: string
    admin_sdk_path?: string
    /** Delivery options applied to every send on this transport. */
    delivery?: RealtimeDeliveryOptions
}

/**
 * Per-send delivery hints for push transports.
 *
 * FCM defaults a data message to normal priority, which Doze and App Standby are
 * free to defer until the next maintenance window — exactly the state a phone is
 * in when something time-critical — an approval someone is waiting on, an alert
 * about to go stale — needs to wake it.
 * `priority: 'high'` is what exempts the message.
 *
 * Only the Firebase transport acts on these; Pusher holds an open connection and
 * has no equivalent, so it ignores them.
 */
export type RealtimeDeliveryOptions = {
    /**
     * `high` wakes a dozing device (FCM `android.priority`, APNs priority 10).
     * Defaults to `normal`. Budgeted by FCM — reserve it for messages a user is
     * actually waiting on.
     */
    priority?: 'normal' | 'high'
    /**
     * How long, in **seconds**, the message stays worth delivering. FCM's own
     * default is four weeks; anything time-critical wants far less, so a stale
     * signal expires instead of surfacing long after the moment it described has
     * passed. `0` asks for now-or-never.
     */
    ttl?: number
    /**
     * Supersede an undelivered message with the same key rather than stacking a
     * second one — e.g. the id of whatever is being signalled, so a retry replaces
     * the message it repeats.
     */
    collapseKey?: string
    /** 
     * Merged over the derived `android` block; escape hatch for anything unmapped. 
     */
    android?: Record<string, unknown>
    /** 
     * Merged over the derived `apns` block; escape hatch for anything unmapped. 
     */
    apns?: Record<string, unknown>
    /** 
     * Merged over the derived `webpush` block; escape hatch for anything unmapped. 
     */
    webpush?: Record<string, unknown>
}

export type RealtimeDriverOptions<T extends RealtimeDriverName = RealtimeDriverName> = {
    transport?: T
    /** Channel/topic to broadcast on. Defaults to `${channel_prefix}${user.id}`. */
    channel?: string
    /** Event name clients subscribe to. Defaults to config `event` or `notification`. */
    event?: string
    /** Also persist the notification to the database (requires a User recipient). */
    store?: boolean
    /** Delivery hints (priority, TTL, collapse key) for push transports. */
    delivery?: RealtimeDeliveryOptions
    /**
     * Build the driver yourself, bypassing the built-ins. Anything satisfying
     * {@link RealtimeDriver} works — a transport this package does not ship (APNs
     * or PushKit, say), or a fake in a test. Supplying this ignores `transport`.
     *
     * Called synchronously; do connection setup lazily inside the driver, as the
     * bundled ones do, so constructing a notification never blocks on a network.
     */
    driverFactory?: () => RealtimeDriver
    pusher?: PusherTransportConfig
    firebase?: FirebaseTransportConfig
}

/** The notification payload delivered to realtime clients. */
export type RealtimeNotificationPayload = {
    id: string
    type: DbNotificationType | null
    title: string
    description: string
    actionText?: string | null
    actionLink?: string | null
    meta?: NotificationData | null
    /**
     * Stable identity for what this notification is *about* — an order, an
     * incident, an approval. A later notification carrying the same tag supersedes
     * this one rather than stacking beside it, so a client can replace what it
     * already showed. Unbounded and client-side; unrelated to the transport's
     * `collapseKey`, which is a queue slot with a much smaller budget.
     */
    tag?: string | null
    /**
     * Marks this message as an instruction to *remove* the notification carrying
     * `tag`, rather than as a notification to display. Absent means display.
     *
     * Prefer superseding with replacement content where there is any: a retraction
     * has nothing to show, so it must travel as a silent push, and silent pushes
     * are the ones platforms throttle hardest.
     */
    retracted?: boolean
    read_at: string | null
    created_at: string
}

/**
 * What a transport will carry. Notifications are the common case and what the
 * builder produces, but a channel is just a channel — an application can push its
 * own event shapes over the same one and pick them up with the client's
 * `listen()`, which has always accepted arbitrary events.
 */
export type RealtimeBroadcastPayload = RealtimeNotificationPayload | Record<string, unknown>

/** The result of a realtime broadcast (plus the stored record when `store` is on). */
export type RealtimeBroadcastResult = {
    channel: string | string[]
    event: string
    payload: RealtimeNotificationPayload
    stored?: UserNotification
}

export type DbNotificationType = 'transaction' | 'pocket' | 'family' | 'security' | 'promo' | 'bill' | 'goal' | string

export type DbNotificationPayload = {
    type?: DbNotificationType | null
    title: string
    description: string
    actionText?: string | null
    actionLink?: string | null
    meta?: NotificationData | null
}

export type DriverResult = unknown

export type NotificationDriverMap = {
    mail: DriverResult
    sms: DriverResult
    db: UserNotification
    realtime: RealtimeBroadcastResult
}

export interface NotificationConfig<T = any> {
    default_driver: 'mail' | 'sms' | 'db'
    drivers: {
        mail: {
            transport: 'smtp' | 'file' | 'sendmail' | 'ses' | Transport<T>;
            from: string | {
                name: string;
                address: string;
            };
            test_address: string
        }
        sms: {
            transport: 'africastalking' | 'twillio'
            from: string
        }
        db: {
            table: string
        }
        realtime?: {
            transport?: RealtimeDriverName
            /** Prefix for the per-user channel/topic (default `user.`). */
            channel_prefix?: string
            /** Event name clients subscribe to (default `notification`). */
            event?: string
            /** Persist broadcasts to the database by default. */
            store?: boolean
            /** Delivery hints applied to every broadcast unless overridden per-send. */
            delivery?: RealtimeDeliveryOptions
            /** Build the driver yourself for every realtime notification. */
            driverFactory?: () => RealtimeDriver
        }
    }
    transports: {
        smtp: ({
            host: string
            port: number
            secure: boolean
            debug?: boolean
            logger?: boolean | Logger
            service?: string
            ignore_tls?: boolean
            require_tls?: boolean
            auth_method?: 'PLAIN' | 'LOGIN' | 'CRAM-MD5'
            test_address?: string
            transaction_log?: boolean
        } & ({
            auth: {
                user: string
                pass: string
            }
            user?: string;
            pass?: string
        } | {
            auth?: {
                user: string
                pass: string
            }
            user: string
            pass: string
        })) | {
            url: string
        }
        ses?: {
            region: string
            [key: string]: any
        }
        sendmail?: {
            path: string
            args?: string[]
        }
        file: {
            directory: string;
            from?: string;
            test_address?: string
        }
        africastalking: {
            username: string;
            apiKey: string;
            senderId: string
        }
        twilio: {
            accountSid: string;
            authToken: string;
            from: string
        }
        pusher?: {
            app_id: string;
            key: string;
            secret: string;
            cluster: string;
            use_tls?: boolean
        }
        firebase?: {
            project_id: string;
            client_email: string;
            private_key: string;
            app_name?: string;
        } | {
            app_name?: string;
            admin_sdk_path: string
        }
    }
    queue?: {
        name?: string,
        connection?: string,
    }
}

export type MergedTransportConfig = MergedConfig<Required<NotificationConfig['transports']>[
    NonNullable<MailDriverOptions['transport']>
]>

export type MailNotificationOptions = MailDriverOptions & {
    transport?: MailDriverOptions['transport'] | Transport
}
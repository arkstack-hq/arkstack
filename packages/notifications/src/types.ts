import type { MergedConfig } from '@arkstack/common'
import type { UserNotification } from '@app/models/UserNotification'

export type NotificationRecipient = string | string[]

export type MailRecipientAddress = Record<string, string>

export type MailRecipient = string | MailRecipientAddress | Array<string | MailRecipientAddress>

export type NotificationData = Record<string, unknown>

export type SmsDriverName = 'africastalking' | 'twilio'

export type RealtimeDriverName = 'pusher' | 'firebase'

export type NotificationChannel = 'mail' | 'sms' | 'db' | 'realtime'

export type MailDriverOptions = {
    transport?: 'africastalking' | 'twilio' | 'file' | 'smtp'
    host?: string
    port?: number
    secure?: boolean
    user?: string
    pass?: string
    from?: string
    testAddress?: string
    directory?: string
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
}

export type RealtimeDriverOptions = {
    transport?: RealtimeDriverName
    /** Channel/topic to broadcast on. Defaults to `${channel_prefix}${user.id}`. */
    channel?: string
    /** Event name clients subscribe to. Defaults to config `event` or `notification`. */
    event?: string
    /** Also persist the notification to the database (requires a User recipient). */
    store?: boolean
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
    read_at: string | null
    created_at: string
}

/** The result of a realtime broadcast (plus the stored record when `store` is on). */
export type RealtimeBroadcastResult = {
    channel: string
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

export interface NotificationConfig {
    default_driver: 'mail' | 'sms' | 'db'
    drivers: {
        mail: {
            transport: 'smtp' | 'file';
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
            transport: RealtimeDriverName
            /** Prefix for the per-user channel/topic (default `user.`). */
            channel_prefix?: string
            /** Event name clients subscribe to (default `notification`). */
            event?: string
            /** Persist broadcasts to the database by default. */
            store?: boolean
        }
    }
    transports: {
        smtp: {
            host: string;
            port: number;
            secure: boolean;
            auth: {
                user: string;
                pass: string
            }
            user?: string;
            pass?: string
            test_address?: string
        } | {
            host: string;
            port: number;
            secure: boolean;
            auth?: {
                user: string;
                pass: string
            }
            user: string;
            pass: string
            test_address?: string
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
            private_key: string
        }
    }
}

export type MergedTransportConfig = MergedConfig<NotificationConfig['transports'][NonNullable<MailDriverOptions['transport']>]>
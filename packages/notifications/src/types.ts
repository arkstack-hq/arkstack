import type { MergedConfig } from '@arkstack/common'
import type { UserNotification } from './Contracts/UserNotification'

export type NotificationRecipient = string | string[]

export type MailRecipientAddress = Record<string, string>

export type MailRecipient = string | MailRecipientAddress | Array<string | MailRecipientAddress>

export type NotificationData = Record<string, unknown>

export type SmsDriverName = 'africastalking' | 'twilio'

export type NotificationChannel = 'mail' | 'sms' | 'db'

export type NotificationUser = {
    id: string | number
    email?: string | null
    phone?: string | null
}

export type MailDriverOptions = {
    transport?: 'africastalking' | 'twilio' | 'file' | 'smtp'
    host?: string
    port?: number
    secure?: boolean
    user?: string
    pass?: string
    from?: string
    testAddress?: string
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
}

export interface NotificationConfig {
    default_driver: 'mail' | 'sms' | 'db'
    drivers: {
        mail: { transport: 'smtp'; from: string; test_address: string }
        sms: { transport: 'africastalking'; from: string }
        db: { table: 'user_notifications' }
    }
    transports: {
        smtp: {
            host: string; port: number; secure: boolean;
            auth: { user: string; pass: string }
            user?: string;
            pass?: string
            test_address?: string
        } | {
            host: string; port: number; secure: boolean;
            auth?: { user: string; pass: string }
            user: string;
            pass: string
            test_address?: string
        }
        file: { directory: string }
        africastalking: { username: string; apiKey: string; senderId: string }
        twilio: { accountSid: string; authToken: string; from: string }
    }
}

export type MergedTransportConfig = MergedConfig<NotificationConfig['transports'][NonNullable<MailDriverOptions['transport']>]>
import type { NotificationData, NotificationRecipient, SmsDriverOptions } from '../types'

import { AfricasTalkingSmsDriver } from './sms/AfricasTalkingSmsDriver'
import { NotificationContract } from '../Contracts/NotificationContract'
import { TwilioSmsDriver } from './sms/TwilioSmsDriver'
import { env } from '@arkstack/common'
import { notificationConfig } from '../config'

type SmsProvider = AfricasTalkingSmsDriver | TwilioSmsDriver

export class SmsNotification extends NotificationContract {
    driver: SmsProvider
    private recipients?: NotificationRecipient
    private fromValue?: string

    constructor(options: SmsDriverOptions = {}) {
        super()

        const driverConfig = notificationConfig<SmsDriverOptions>('drivers.sms', {})
        const transport = options.transport ?? driverConfig.transport ?? 'twilio'
        const transportConfig = notificationConfig<Record<string, any>>(`transports.${transport}`, {})
        const legacySmsConfig = notificationConfig<SmsDriverOptions>('sms', {})
        const driver = transport
        const from = options.from ?? driverConfig.from ?? legacySmsConfig.from

        this.fromValue = from
        this.driver = driver === 'twilio'
            ? new TwilioSmsDriver({
                ...legacySmsConfig.twilio,
                ...transportConfig,
                ...options.twilio,
                from: options.twilio?.from ?? transportConfig.from ?? legacySmsConfig.twilio?.from ?? from,
            })
            : new AfricasTalkingSmsDriver({
                ...legacySmsConfig.africastalking,
                ...transportConfig,
                ...options.africastalking,
                senderId: options.africastalking?.senderId ?? transportConfig.senderId ?? legacySmsConfig.africastalking?.senderId ?? from,
            })
    }

    from (from: string): this {
        this.fromValue = from

        return this
    }

    subject (_subject: string): this {
        return this
    }

    recipient (recipient: NotificationRecipient): this {
        this.recipients = recipient

        return this
    }

    async send (
        message: string,
        _subject?: string,
        recipient?: NotificationRecipient,
        data?: NotificationData
    ) {
        const resolvedRecipient = recipient ?? this.recipients

        if (!resolvedRecipient) {
            throw new Error('No recipient provided for SMS notification')
        }

        return await this.driver.send(message, resolvedRecipient, {
            app_name: env('APP_NAME', 'Arkstack'),
            from: this.fromValue,
            ...this.mergeData(data),
        })
    }
}

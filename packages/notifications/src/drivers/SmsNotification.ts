import type { NotificationData, NotificationRecipient, SmsDriverOptions } from '../types'

import { AfricasTalkingSmsDriver } from './sms/AfricasTalkingSmsDriver'
import { NotificationContract } from '../Contracts/NotificationContract'
import { TwilioSmsDriver } from './sms/TwilioSmsDriver'
import { configure } from '../config'
import { env } from '@arkstack/common'

type SmsProvider = AfricasTalkingSmsDriver | TwilioSmsDriver

export class SmsNotification extends NotificationContract {
    driver: SmsProvider
    private recipients?: NotificationRecipient
    private fromValue?: string

    constructor(options: SmsDriverOptions = {}) {
        super()

        const driverConfig = configure('drivers.sms', {})
        const transport = options.transport ?? driverConfig.transport ?? 'twilio'
        const transportConfig = configure(`transports.${transport}` as any, {})
        const from = options.from ?? driverConfig.from

        this.fromValue = from
        this.driver = transport === 'twilio'
            ? new TwilioSmsDriver({
                ...transportConfig,
                ...options.twilio,
                from: options.twilio?.from ?? transportConfig.from ?? from,
            })
            : new AfricasTalkingSmsDriver({
                ...transportConfig,
                ...options.africastalking,
                senderId: options.africastalking?.senderId ?? transportConfig.senderId ?? from,
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

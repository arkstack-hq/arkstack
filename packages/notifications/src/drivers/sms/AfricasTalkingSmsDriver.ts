import type { NotificationData, NotificationRecipient, SmsDriverOptions } from '../../types'

import africastalking from 'africastalking'
import { env } from '@arkstack/common'
import { interpolate } from '../../utils/template'

export class AfricasTalkingSmsDriver {
    private driver: {
        send: (payload: { to: string; from?: string; message: string }) => Promise<unknown>
        sendBulk: (payload: { to: string[]; from?: string; message: string }) => Promise<unknown>
    }
    private senderId?: string

    constructor(options: SmsDriverOptions['africastalking'] = {}) {
        const username: string = options.username ?? env('AFRICASTALKING_USERNAME', 'sandbox')
        const apiKey: string = options.apiKey ?? env('AFRICASTALKING_API_KEY', 'sandbox')

        this.senderId = options.senderId ?? env('AFRICASTALKING_SENDER_ID', env('SMS_FROM', 'Arkstack'))

        this.driver = africastalking({ username, apiKey }).SMS
    }

    async send(message: string, recipient: NotificationRecipient, data: NotificationData = {}) {
        const recipients = Array.isArray(recipient) ? recipient : [recipient]
        const resolvedMessage = interpolate(message, data)

        if (recipients.length > 1) {
            return await this.driver.sendBulk({
                to: recipients,
                from: this.senderId,
                message: resolvedMessage,
            })
        }

        return await this.driver.send({
            to: recipients[0],
            from: this.senderId,
            message: resolvedMessage,
        })
    }
}

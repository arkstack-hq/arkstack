import type { NotificationData, NotificationRecipient, SmsDriverOptions } from '../../types'

import { env } from '@arkstack/common'
import { interpolate } from '../../utils/template'
import twilio from 'twilio'

export class TwilioSmsDriver {
    private client: ReturnType<typeof twilio>
    private fromNumber: string

    constructor(options: SmsDriverOptions['twilio'] = {}) {
        const accountSid = options.accountSid ?? env('TWILIO_ACCOUNT_SID', '')
        const authToken = options.authToken ?? env('TWILIO_AUTH_TOKEN', '')

        this.fromNumber = options.from ?? env('TWILIO_FROM', env('SMS_FROM', ''))
        this.client = twilio(accountSid, authToken)
    }

    async send (message: string, recipient: NotificationRecipient, data: NotificationData = {}) {
        const recipients = Array.isArray(recipient) ? recipient : [recipient]
        const resolvedMessage = interpolate(message, data)

        return await Promise.all(recipients.map(async to => await this.client.messages.create({
            body: resolvedMessage,
            from: this.fromNumber,
            to,
        })))
    }
}

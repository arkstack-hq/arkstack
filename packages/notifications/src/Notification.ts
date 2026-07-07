import type { MailDriverOptions, MailRecipient, NotificationChannel, NotificationData, NotificationRecipient, RealtimeDriverOptions, SmsDriverOptions } from './types'

import { DbNotification } from './drivers/DbNotification'
import { DriverMap } from './Contracts/Maps'
import { MailNotification } from './drivers/MailNotification'
import { RealtimeNotification } from './drivers/RealtimeNotification'
import { SmsNotification } from './drivers/SmsNotification'
import type { User } from '@app/models/User'
import { configure } from './config'

type DriverOptions = MailDriverOptions | SmsDriverOptions | RealtimeDriverOptions

export class Notification<D extends keyof DriverMap = keyof DriverMap> {
    private driver: DriverMap[D]

    constructor(driver: D, options: DriverOptions = {}) {
        this.driver = Notification.createDriver(driver, options) as DriverMap[D]
    }

    static mail(options?: MailDriverOptions) {
        return new MailNotification(options)
    }

    static email(options?: MailDriverOptions) {
        return this.mail(options)
    }

    static sms(options?: SmsDriverOptions) {
        return new SmsNotification(options)
    }

    static db() {
        return new DbNotification()
    }

    static realtime(options?: RealtimeDriverOptions) {
        return new RealtimeNotification(options)
    }

    static channel(channel?: NotificationChannel | 'email', options?: DriverOptions) {
        return Notification.createDriver(channel ?? configure('default_driver', 'mail'), options)
    }

    prepare(recipient?: null | MailRecipient | NotificationRecipient | User, data: NotificationData = {}) {
        this.driver.data(data)

        if (recipient && typeof recipient === 'object' && !Array.isArray(recipient) && typeof recipient.id !== 'undefined') {
            if (this.driver instanceof MailNotification) {
                if (recipient.email) {
                    this.driver.recipient(recipient.email)
                }
            } else if (this.driver instanceof SmsNotification) {
                if (recipient.phone) {
                    this.driver.recipient(recipient.phone)
                }
            } else {
                this.driver.recipient(recipient as never)
            }

            return this.driver
        }

        if (recipient) {
            this.driver.recipient(recipient as NotificationRecipient)
        }

        return this.driver
    }

    private static createDriver(
        driver: NotificationChannel | 'email',
        options: DriverOptions = {}
    ) {
        switch (driver) {
            case 'mail':
            case 'email':
                return new MailNotification(options as MailDriverOptions)
            case 'sms':
                return new SmsNotification(options as SmsDriverOptions)
            case 'db':
                return new DbNotification()
            case 'realtime':
                return new RealtimeNotification(options as RealtimeDriverOptions)
            default:
                throw new Error(`Unsupported notification driver: ${driver}`)
        }
    }
}

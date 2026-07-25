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

    constructor(driver: 'sms', options?: SmsDriverOptions)
    constructor(driver: 'realtime', options?: RealtimeDriverOptions)
    constructor(driver: 'mail' | 'email', options?: MailDriverOptions)
    constructor(driver: 'db')
    constructor(
        driver: NotificationChannel | 'email',
        options = {}
    ) {
        this.driver = Notification.createDriver(driver as never, options) as DriverMap[D]
    }

    /**
     * Send an email notification
     * 
     * @param options 
     * @returns 
     */
    static mail(options?: MailDriverOptions) {
        return new MailNotification(options)
    }

    /**
     * Send an email notification
     * 
     * @param options 
     * @alias {@link mail}
     * @returns 
     */
    static email(options?: MailDriverOptions) {
        return this.mail(options)
    }

    /**
     * Send an sms notification
     * 
     * @param options 
     * @returns 
     */
    static sms(options?: SmsDriverOptions) {
        return new SmsNotification(options)
    }

    /**
     * Send a database notification
     * 
     * @param options 
     * @returns 
     */
    static db() {
        return new DbNotification()
    }

    /**
     * Send a realtime notification
     * 
     * @param options 
     * @returns 
     */
    static realtime(options?: RealtimeDriverOptions) {
        return new RealtimeNotification(options)
    }

    /**
     * Use a specific channel to send this notification
     * 
     * @param channel 
     * @param options 
     */
    static channel(channel: 'sms', options?: SmsDriverOptions): SmsNotification
    static channel(channel: 'realtime', options?: RealtimeDriverOptions): RealtimeNotification
    static channel(channel: 'mail' | 'email', options?: MailDriverOptions): MailNotification
    static channel(channel: 'db'): DbNotification
    static channel(): MailNotification | SmsNotification | DbNotification | RealtimeNotification
    static channel<D extends NotificationChannel | 'email'>(
        channel?: D,
        options?: DriverOptions
    ): MailNotification | SmsNotification | DbNotification | RealtimeNotification {
        channel ??= configure('default_driver', 'mail') as D

        return Notification.createDriver(channel as never, options as never)
    }

    /**
     * Prepare the notification
     * 
     * @param recipient 
     * @param data 
     * @returns 
     */
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

    private static createDriver(driver: 'sms', options?: SmsDriverOptions): SmsNotification
    private static createDriver(driver: 'realtime', options?: RealtimeDriverOptions): RealtimeNotification
    private static createDriver(driver: 'mail' | 'email', options?: MailDriverOptions): MailNotification
    private static createDriver(driver: 'db'): DbNotification
    private static createDriver<D extends NotificationChannel | 'email'>(
        driver: D,
        options: DriverOptions = {}
    ): MailNotification | SmsNotification | DbNotification | RealtimeNotification {
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

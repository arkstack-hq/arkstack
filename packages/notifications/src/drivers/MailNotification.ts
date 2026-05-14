import { config, env } from '@arkstack/common'
import nodemailer, { type Transporter } from 'nodemailer'

import { NotificationContract } from '../Contracts/NotificationContract'
import { interpolate } from '../utils/template'
import { notificationConfig } from '../config'
import type { MailDriverOptions, MailRecipient, MailRecipientAddress, NotificationData } from '../types'
import type { User } from '@arkstack/auth'

export class MailNotification extends NotificationContract {
    driver: Transporter
    private fromAddress?: string
    private subjectLine?: string
    private recipients?: MailRecipient
    private ViewName: string = '~arkstack/notifications.mail'
    private htmlTemplate?: string
    private textTemplate?: string

    constructor(options: MailDriverOptions = {}) {
        super()

        const driverConfig = notificationConfig<Record<string, any>>('drivers.mail', {})
        const transport = options.transport ?? driverConfig.transport ?? 'smtp'
        const transportConfig = notificationConfig<Record<string, any>>(`transports.${transport}`, {})
        const legacyMailConfig = notificationConfig<Record<string, any>>('mail', {})
        const legacySmtpConfig = notificationConfig<Record<string, any>>('smtp', {})
        const smtpConfig = {
            ...legacySmtpConfig,
            ...(legacyMailConfig.smtp ?? {}),
            ...transportConfig,
        }
        const host = options.host ?? smtpConfig.host ?? env('SMTP_HOST', 'localhost')
        const port = options.port ?? smtpConfig.port ?? env('SMTP_PORT', 1025)
        const secure = options.secure ?? smtpConfig.secure ?? env('SMTP_SECURE', false)
        const user = options.user ?? smtpConfig.auth?.user ?? smtpConfig.user ?? env('SMTP_USERNAME', '')
        const pass = options.pass ?? smtpConfig.auth?.pass ?? smtpConfig.pass ?? env('SMTP_PASSWORD', '')

        this.fromAddress = options.from ?? driverConfig.from ?? legacyMailConfig.from ?? smtpConfig.from ?? env('SMTP_FROM_ADDRESS', 'no-reply@example.com')
        this.driver = nodemailer.createTransport({
            host,
            port: Number(port),
            secure: Boolean(secure),
            auth: user || pass ? { user, pass } : undefined,
        })
    }

    from (from: string): this {
        this.fromAddress = from

        return this
    }

    /**
     * The email subject
     * 
     * @param subject 
     * @returns 
     */
    subject (subject: string): this {
        this.subjectLine = subject

        return this
    }

    /**
     * Set email the notification recipeint
     * 
     * @param recipient string or array of email addresses
     * @returns 
     */
    recipient (recipient: MailRecipient): this {
        this.recipients = recipient

        return this
    }

    /**
     * Set email the notification view name
     * 
     * @param view view name
     * @returns 
     */
    view (view: string): this {
        this.ViewName = view

        return this
    }

    /**
     * Set email the notification html template
     * 
     * @param content view name
     * @returns 
     */
    html (content: string): this {
        this.htmlTemplate = content

        return this
    }

    /**
     * Set email the notification text template
     * 
     * @param content view name
     * @returns 
     */
    text (content: string): this {
        this.textTemplate = content

        return this
    }

    /**
     * Prepare a notification to be sent.
     * 
     * @param user The recipient user(s) for the notification.
     */
    prepare (user?: null | string | string[] | User, data: Record<string, any> = {}) {
        this.data(data)

        if (user && typeof user === 'object' && !Array.isArray(user)) {
            user = user.email
        }

        if (user) {
            this.recipient(user)
        }

        return this
    }

    /**
     * Send a notification to the specified recipient(s) with the given message.
     * 
     * @param message The message content to be sent to the recipient(s).
     * @param subject The message subject to be sent to the recipient(s).
     * @param recipient An array of recipient identifiers
     * @param data Additioal context data
     * @returns 
     */
    async send (
        message: string,
        subject?: string,
        recipient?: MailRecipient,
        data?: NotificationData
    ) {
        const mergedData = {
            app_name: config('app.name', 'Arkstack'),
            ...this.mergeData(data),
        }
        const resolvedSubject = interpolate(subject ?? this.subjectLine ?? '', mergedData)
        const resolvedMessage = interpolate(message, mergedData)
        const to = this.resolveRecipients(recipient)

        if (to.length < 1) {
            throw new Error('No recipient provided for mail notification')
        }

        const templateData = {
            ...mergedData,
            message: resolvedMessage,
            subject: resolvedSubject,
        }

        const textMessage = resolvedMessage.replace(/<\/?[^>]+(>|$)/g, '')

        return await this.driver.sendMail({
            to: to as never,
            subject: resolvedSubject,
            from: this.fromAddress,
            text: interpolate(
                this.textTemplate ?? textMessage,
                { ...templateData, message: textMessage }
            ),
            html: this.htmlTemplate
                ? interpolate(this.htmlTemplate, templateData)
                : await globalThis.view(this.ViewName, templateData),
        })
    }

    private resolveRecipients (recipient?: MailRecipient) {
        const recipients = recipient ?? this.recipients
        const resolved = (Array.isArray(recipients)
            ? [...recipients]
            : recipients
                ? [recipients]
                : []
        ).flatMap(recipient => this.normalizeRecipient(recipient) as unknown)

        const driverConfig = notificationConfig<Record<string, any>>('drivers.mail', {})
        const transport = driverConfig.transport ?? 'smtp'
        const transportConfig = notificationConfig<Record<string, any>>(`transports.${transport}`, {})
        const testAddress = driverConfig.testAddress
            ?? driverConfig.test_address
            ?? transportConfig.testAddress
            ?? transportConfig.test_address
            ?? env<string | undefined>('SMTP_TEST_ADDRESS')

        if (env('NODE_ENV') !== 'production' && testAddress) {
            resolved.push(testAddress)
        }

        return resolved
    }

    private normalizeRecipient (recipient: string | MailRecipientAddress) {
        if (typeof recipient === 'string') {
            return [recipient]
        }

        return Object.entries(recipient).map(([address, name]) => ({ address, name }))
    }
}

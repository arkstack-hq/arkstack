import { config, env } from '@arkstack/common'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import nodemailer, { type Transporter } from 'nodemailer'

import { NotificationContract } from '../Contracts/NotificationContract'
import { interpolate } from '../utils/template'
import { configure } from '../config'
import type {
    MailDriverOptions,
    MailRecipient,
    MailRecipientAddress,
    MergedTransportConfig,
    NotificationData,
} from '../types'
import { User } from '@arkstack/auth'
import { Arkstack } from '@arkstack/contract'

export class MailNotification extends NotificationContract {
    driver: Transporter
    private fromAddress?: string | { name: string; address: string }
    private subjectLine?: string
    private recipients?: MailRecipient
    private ViewName: string = '~arkstack/notifications.mail'
    private htmlTemplate?: string
    private textTemplate?: string
    private fileDirectory?: string

    constructor(options: MailDriverOptions = {}) {
        super()

        const driver = configure('drivers.mail', {})
        const trpt = driver.transport ?? 'smtp'
        const transport = configure(
            `transports.${trpt}`,
            {},
        ) as MergedTransportConfig

        if (trpt === 'file') {
            this.fileDirectory =
                options.directory ??
                transport.directory ??
                env('MAIL_FILE_PATH', join(Arkstack.rootDir(), './storage/framework/mails'))

            this.fromAddress =
                options.from ??
                driver.from ??
                transport.from ??
                env('MAIL_FROM_ADDRESS', 'no-reply@example.com')

            this.driver = nodemailer.createTransport({
                streamTransport: true,
                buffer: true,
            })

            return
        }

        const host =
            options.host ?? transport.host ?? env('MAIL_HOST', 'localhost')
        const port = options.port ?? transport.port ?? env('MAIL_PORT', 1025)
        const secure =
            options.secure ?? transport.secure ?? env('MAIL_SECURE', false)

        const user =
            options.user ??
            transport.auth?.user ??
            transport.user ??
            env('MAIL_USERNAME', '')

        const pass =
            options.pass ??
            transport.auth?.pass ??
            transport.pass ??
            env('MAIL_PASSWORD', '')

        this.fromAddress =
            options.from ??
            driver.from ??
            transport.from ??
            env('MAIL_FROM_ADDRESS', 'no-reply@example.com')

        this.driver = nodemailer.createTransport({
            host,
            port: Number(port),
            secure: Boolean(secure),
            auth: user || pass ? { user, pass } : undefined,
        })
    }

    from(from: string): this {
        this.fromAddress = from

        return this
    }

    /**
     * The email subject
     *
     * @param subject
     * @returns
     */
    subject(subject: string): this {
        this.subjectLine = subject

        return this
    }

    /**
     * Set email the notification recipeint
     *
     * @param recipient string or array of email addresses
     * @returns
     */
    recipient(recipient: MailRecipient): this {
        this.recipients = recipient

        return this
    }

    /**
     * Set email the notification view name
     *
     * @param view view name
     * @returns
     */
    view(view: string): this {
        this.ViewName = view

        return this
    }

    /**
     * Set email the notification html template
     *
     * @param content view name
     * @returns
     */
    html(content: string): this {
        this.htmlTemplate = content

        return this
    }

    /**
     * Set email the notification text template
     *
     * @param content view name
     * @returns
     */
    text(content: string): this {
        this.textTemplate = content

        return this
    }

    /**
     * Prepare a notification to be sent.
     *
     * @param user The recipient user(s) for the notification.
     */
    prepare(
        user?: null | string | string[] | User,
        data: Record<string, any> = {},
    ) {
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
    async send(
        message: string,
        subject?: string,
        recipient?: MailRecipient,
        data?: NotificationData,
    ) {
        const mergedData = {
            app_name: config('app.name', 'Arkstack'),
            ...this.mergeData(data),
        }
        const resolvedSubject = interpolate(
            subject ?? this.subjectLine ?? '',
            mergedData,
        )
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

        const payload = {
            to: to as never,
            subject: resolvedSubject,
            from: this.fromAddress,
            text: interpolate(this.textTemplate ?? textMessage, {
                ...templateData,
                message: textMessage,
            }),
            html: this.htmlTemplate
                ? interpolate(this.htmlTemplate, templateData)
                : await globalThis.view(this.ViewName, templateData),
        }
        const result = await this.driver.sendMail(payload)

        if (this.fileDirectory) {
            await this.storeFileMail(payload, result as Record<string, any>)
        }

        return result
    }

    private async storeFileMail(
        payload: Record<string, any>,
        result: Record<string, any>,
    ) {
        const now = new Date()
        const date = now.toISOString().slice(0, 10)
        const directory = join(this.fileDirectory as string, date)
        const id = String(result.messageId || now.getTime()).replace(
            /[^a-zA-Z0-9_.-]/g,
            '-',
        )
        const path = join(directory, now.getTime() + '-' + id + '.json')
        const message = result.message

        await mkdir(directory, { recursive: true })
        await writeFile(
            path,
            JSON.stringify(
                {
                    id: result.messageId,
                    date: now.toISOString(),
                    envelope: result.envelope,
                    accepted: result.accepted,
                    rejected: result.rejected,
                    pending: result.pending,
                    response: result.response,
                    message: {
                        from: payload.from,
                        to: payload.to,
                        subject: payload.subject,
                        text: payload.text,
                        html: payload.html,
                        raw: Buffer.isBuffer(message)
                            ? message.toString('utf8')
                            : String(message ?? ''),
                    },
                },
                null,
                2,
            ),
            'utf8',
        )

        return path
    }

    private resolveRecipients(recipient?: MailRecipient) {
        const recipients = recipient ?? this.recipients
        const resolved = (
            Array.isArray(recipients)
                ? [...recipients]
                : recipients
                    ? [recipients]
                    : []
        ).flatMap((recipient) => this.normalizeRecipient(recipient) as unknown)

        const driver = configure('drivers.mail', {})
        const trpt = driver.transport ?? 'smtp'
        const transport = configure(
            `transports.${trpt}`,
            {},
        ) as MergedTransportConfig

        const testAddress =
            driver.test_address ??
            driver.test_address ??
            transport.test_address ??
            transport.test_address ??
            env('MAIL_TEST_ADDRESS')

        if (env('NODE_ENV') !== 'production' && testAddress) {
            resolved.push(testAddress)
        }

        return resolved
    }

    private normalizeRecipient(recipient: string | MailRecipientAddress) {
        if (typeof recipient === 'string') {
            return [recipient]
        }

        return Object.entries(recipient).map(([address, name]) => ({
            address,
            name,
        }))
    }
}

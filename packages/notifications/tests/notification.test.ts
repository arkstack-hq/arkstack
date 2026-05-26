import { DbNotification, MailNotification, Notification, SmsNotification, UserNotification as UserNotificationAbs, UserNotificationCenter, configure, interpolate } from '../src'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'

import { View } from '@arkstack/view'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

View.boot()

class UserNotification extends UserNotificationAbs { }

const mocks = vi.hoisted(() => {
    const sendMail = vi.fn(async payload => ({
        accepted: payload.to,
        messageId: 'test-message-id',
    }))
    const createTransport = vi.fn((options?: Record<string, any>) => ({
        sendMail: options?.streamTransport
            ? vi.fn(async payload => {
                const result = await sendMail(payload)

                return {
                    ...result,
                    envelope: { from: payload.from, to: payload.to },
                    message: Buffer.from('Subject: ' + payload.subject + '\n\n' + payload.text),
                }
            })
            : sendMail,
    }))
    const create = vi.fn(async payload => ({
        id: 1,
        readAt: null,
        ...payload,
    }))
    const deleteQuery = vi.fn(async () => undefined)
    const get = vi.fn(async () => [])
    const update = vi.fn(async () => undefined)
    const where = vi.fn(() => ({
        delete: deleteQuery,
        get,
        update,
    }))
    const africasTalkingSend = vi.fn(async payload => ({
        provider: 'africastalking',
        payload,
    }))
    const africasTalkingSendBulk = vi.fn(async payload => ({
        provider: 'africastalking',
        payload,
    }))
    const env = vi.fn((key: string, defaultValue?: unknown) => process.env[key] ?? defaultValue)
    const config = vi.fn((_key: string, defaultValue?: unknown) => defaultValue)
    const getModel = vi.fn(async () => ({
        query: () => ({
            create,
            where,
        }),
    }))
    const twilioCreate = vi.fn(async payload => ({
        provider: 'twilio',
        sid: 'SM_TEST',
        ...payload,
    }))

    return {
        africasTalkingSend,
        africasTalkingSendBulk,
        config,
        create,
        env,
        getModel,
        sendMail,
        createTransport,
        twilioCreate,
        deleteQuery,
        get,
        update,
        where,
    }
})

vi.mock('africastalking', () => ({
    default: vi.fn(() => ({
        SMS: {
            send: mocks.africasTalkingSend,
            sendBulk: mocks.africasTalkingSendBulk,
        },
    })),
}))

vi.mock('nodemailer', () => ({
    default: {
        createTransport: mocks.createTransport,
    },
}))

vi.mock('@arkstack/common', () => ({
    config: mocks.config,
    env: mocks.env,
    getModel: mocks.getModel,
}))

vi.mock('twilio', () => ({
    default: vi.fn(() => ({
        messages: {
            create: mocks.twilioCreate,
        },
    })),
}))

describe('Notification', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.config.mockImplementation((_key: string, defaultValue?: unknown) => defaultValue)
    })

    it('interpolates template data', () => {
        expect(interpolate('Hello {name}, your code is {code}', {
            code: '123456',
            name: 'Ada',
        })).toBe('Hello Ada, your code is 123456')
    })

    it('creates default drivers by channel', () => {
        expect(Notification.mail()).toBeInstanceOf(MailNotification)
        expect(Notification.email()).toBeInstanceOf(MailNotification)
        expect(Notification.sms()).toBeInstanceOf(SmsNotification)
        expect(Notification.db()).toBeInstanceOf(DbNotification)
    })

    it('throws for unsupported notification drivers', () => {
        expect(() => Notification.channel('push' as never)).toThrow('Unsupported notification driver: push')
    })

    it('creates the configured default driver', () => {
        mocks.config.mockImplementation((key: string, defaultValue?: unknown) => {
            if (key === 'notifications.default_driver') {
                return 'sms'
            }

            return defaultValue
        })

        expect(Notification.channel()).toBeInstanceOf(SmsNotification)
    })

    it('prepares user recipients for mail and sms channels', () => {
        const user = {
            id: 1,
            email: 'ada@example.com',
            phone: '+2348012345678',
        }

        expect(new Notification('mail').prepare(user)).toBeInstanceOf(MailNotification)
        expect(new Notification('sms').prepare(user)).toBeInstanceOf(SmsNotification)
        expect(new Notification('db').prepare(user)).toBeInstanceOf(DbNotification)
    })

    it('leaves user recipients unset when channel-specific address fields are missing', async () => {
        await expect(new Notification('mail').prepare({ id: 1 }).send('Hello')).rejects.toThrow('No recipient provided for mail notification')
        await expect(new Notification('sms').prepare({ id: 1 }).send('Hello')).rejects.toThrow('No recipient provided for SMS notification')
    })

    it('delivers mail with interpolated subject, body, sender, and recipients', async () => {
        const response = await Notification.mail({
            from: 'noreply@arkstack.test',
            host: 'smtp.arkstack.test',
            port: 2525,
        })
            .recipient(['ada@example.com', 'grace@example.com'])
            .subject('Welcome, {name}')
            .data({
                app_name: 'Arkstack',
                name: 'Ada',
            })
            .send('<strong>Hello {name}</strong>')

        expect(response).toEqual({
            accepted: ['ada@example.com', 'grace@example.com'],
            messageId: 'test-message-id',
        })
        expect(mocks.sendMail).toHaveBeenCalledTimes(1)
        expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
            from: 'noreply@arkstack.test',
            subject: 'Welcome, Ada',
            text: 'Hello Ada',
            to: ['ada@example.com', 'grace@example.com'],
        }))
        const content = String(mocks.sendMail.mock.calls[0][0].html)
        expect(content).toContain('<h2>Welcome, Ada</h2>')
        expect(content).toContain('<div><strong>Hello Ada</strong></div>')
    })

    it('delivers mail with custom html and text templates', async () => {
        const response = await Notification.mail({
            from: 'noreply@arkstack.test',
            host: 'smtp.arkstack.test',
            port: 2525,
        })
            .recipient(['ada@example.com', 'grace@example.com'])
            .subject('Welcome, {name}')
            .data({
                app_name: 'Arkstack',
                name: 'Ada',
            })
            .text('Subject: {subject}\nMessage: {message}')
            .html(`
               <html>
                <head><title>{subject}</title></head>
                <body>{message}</body>
               </html>
            `)
            .send('<strong>Hello {name}</strong>')

        expect(response).toEqual({
            accepted: ['ada@example.com', 'grace@example.com'],
            messageId: 'test-message-id',
        })
        expect(mocks.sendMail).toHaveBeenCalledTimes(1)
        expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
            from: 'noreply@arkstack.test',
            subject: 'Welcome, Ada',
            text: 'Subject: Welcome, Ada\nMessage: Hello Ada',
            to: ['ada@example.com', 'grace@example.com'],
        }))
        const content = String(mocks.sendMail.mock.calls[0][0].html)
        expect(content).toContain('<title>Welcome, Ada</title>')
        expect(content).toContain('<body><strong>Hello Ada</strong></body>')
    })

    it('delivers mail to named address recipients', async () => {
        const recipients = [
            { 'ada@example.com': 'Ada Lovelace' },
            { 'grace@example.com': 'Grace Hopper' },
        ]
        const nodemailerRecipients = [
            { address: 'ada@example.com', name: 'Ada Lovelace' },
            { address: 'grace@example.com', name: 'Grace Hopper' },
        ]
        const response = await Notification.mail({
            from: 'noreply@arkstack.test',
        })
            .recipient(recipients as never)
            .subject('Hello')
            .send('Named recipients work')

        expect(response).toEqual({
            accepted: nodemailerRecipients,
            messageId: 'test-message-id',
        })
        expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
            to: nodemailerRecipients,
        }))
    })

    it('adds a configured test mail recipient outside production', async () => {
        mocks.config.mockImplementation((key: string, defaultValue?: unknown) => {
            if (key === 'notifications.drivers.mail') {
                return {
                    test_address: 'mailbox@arkstack.test',
                }
            }

            return defaultValue
        })

        await Notification.mail({ from: 'noreply@arkstack.test' })
            .recipient('ada@example.com')
            .send('Hello')

        expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
            to: ['ada@example.com', 'mailbox@arkstack.test'],
        }))
    })

    it('stores file transport mails as date-grouped JSON files', async () => {
        const directory = await mkdtemp(join(tmpdir(), 'arkstack-mails-'))

        try {
            mocks.config.mockImplementation((key: string, defaultValue?: unknown) => {
                if (key === 'notifications.drivers.mail') {
                    return {
                        transport: 'file',
                        from: 'configured@arkstack.test',
                    }
                }

                if (key === 'notifications.transports.file') {
                    return { directory }
                }

                return defaultValue
            })

            await Notification.mail()
                .recipient('ada@example.com')
                .subject('Stored')
                .send('File mail works')

            expect(mocks.createTransport).toHaveBeenCalledWith({
                streamTransport: true,
                buffer: true,
            })

            const date = new Date().toISOString().slice(0, 10)
            const files = await readdir(join(directory, date))
            const stored = JSON.parse(await readFile(join(directory, date, files[0]), 'utf8'))

            expect(stored.message).toMatchObject({
                from: 'configured@arkstack.test',
                subject: 'Stored',
                text: 'File mail works',
            })
            expect(stored.message.to).toEqual(['ada@example.com'])
            expect(stored.message.raw).toContain('Subject: Stored')
        } finally {
            await rm(directory, { recursive: true, force: true })
        }
    })

    it('throws when mail recipients are missing', async () => {
        await expect(Notification.mail().send('Hello')).rejects.toThrow('No recipient provided for mail notification')
    })

    it('uses mail config defaults when constructor options are omitted', async () => {
        mocks.config.mockImplementation((key: string, defaultValue?: unknown) => {
            if (key === 'notifications.drivers.mail') {
                return {
                    transport: 'smtp',
                    from: 'configured@arkstack.test',
                }
            }

            if (key === 'notifications.transports.smtp') {
                return {
                    host: 'smtp.config.test',
                    port: 2526,
                    secure: true,
                    auth: {
                        user: 'configured-user',
                        pass: 'configured-pass',
                    },
                }
            }

            return defaultValue
        })

        await Notification.mail()
            .recipient('ada@example.com')
            .subject('Configured')
            .send('Mail config works')

        expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
            from: 'configured@arkstack.test',
            to: ['ada@example.com'],
        }))
    })

    it('delivers SMS through AfricasTalking with interpolated message data', async () => {
        const response = await Notification.sms({
            africastalking: {
                apiKey: 'key',
                senderId: 'ARK',
                username: 'sandbox',
            },
            transport: 'africastalking',
        })
            .recipient(['+2348012345678', '+2348098765432'])
            .data({ code: '123456' })
            .send('Your code is {code}')

        expect(response).toEqual({
            provider: 'africastalking',
            payload: {
                from: 'ARK',
                message: 'Your code is 123456',
                to: ['+2348012345678', '+2348098765432'],
            },
        })
        expect(mocks.africasTalkingSend).not.toHaveBeenCalled()
        expect(mocks.africasTalkingSendBulk).toHaveBeenCalledTimes(1)
        expect(mocks.africasTalkingSendBulk).toHaveBeenCalledWith({
            from: 'ARK',
            message: 'Your code is 123456',
            to: ['+2348012345678', '+2348098765432'],
        })
    })

    it('delivers SMS through Twilio with interpolated message data', async () => {
        const response = await Notification.sms({
            transport: 'twilio',
            twilio: {
                accountSid: 'AC_TEST',
                authToken: 'token',
                from: '+15005550006',
            },
        })
            .recipient('+15005550001')
            .send('Your login code is {code}', undefined, undefined, {
                code: '654321',
            })

        expect(response).toEqual([{
            body: 'Your login code is 654321',
            from: '+15005550006',
            provider: 'twilio',
            sid: 'SM_TEST',
            to: '+15005550001',
        }])
        expect(mocks.twilioCreate).toHaveBeenCalledTimes(1)
        expect(mocks.twilioCreate).toHaveBeenCalledWith({
            body: 'Your login code is 654321',
            from: '+15005550006',
            to: '+15005550001',
        })
    })

    it('uses SMS config defaults when constructor options are omitted', async () => {
        mocks.config.mockImplementation((key: string, defaultValue?: unknown) => {
            if (key === 'notifications.drivers.sms') {
                return {
                    transport: 'twilio',
                }
            }

            if (key === 'notifications.transports.twilio') {
                return {
                    accountSid: 'AC_CONFIG',
                    authToken: 'config-token',
                    from: '+15005550007',
                }
            }

            return defaultValue
        })

        await Notification.sms()
            .recipient('+15005550002')
            .send('Config SMS {code}', undefined, undefined, { code: '111222' })

        expect(mocks.twilioCreate).toHaveBeenCalledWith({
            body: 'Config SMS 111222',
            from: '+15005550007',
            to: '+15005550002',
        })
    })

    it('delivers single-recipient SMS through AfricasTalking send', async () => {
        await Notification.sms({
            africastalking: {
                apiKey: 'key',
                senderId: 'ARK',
                username: 'sandbox',
            },
            transport: 'africastalking',
        })
            .from('IGNORED_BY_DRIVER_INSTANCE')
            .subject('Noop subject')
            .recipient('+2348012345678')
            .send('Hi {name}', undefined, undefined, { name: 'Ada' })

        expect(mocks.africasTalkingSendBulk).not.toHaveBeenCalled()
        expect(mocks.africasTalkingSend).toHaveBeenCalledWith({
            from: 'ARK',
            message: 'Hi Ada',
            to: '+2348012345678',
        })
    })

    it('throws when SMS recipients are missing', async () => {
        await expect(Notification.sms().send('Hello')).rejects.toThrow('No recipient provided for SMS notification')
    })

    it('delivers database notifications through the UserNotification model', async () => {
        const user = {
            id: 7,
            email: 'ada@example.com',
        }
        const notification = await Notification.db()
            .recipient(user)
            .type('security')
            .subject('Login from {device}')
            .action('Review', '/account/security')
            .meta({ severity: 'info' })
            .send('We noticed a login from {device}.', undefined, undefined, {
                device: 'Safari on macOS',
            })

        expect(mocks.getModel).toHaveBeenCalledWith('UserNotification')
        expect(mocks.create).toHaveBeenCalledTimes(1)
        expect(mocks.create).toHaveBeenCalledWith({
            actionLink: '/account/security',
            actionText: 'Review',
            description: 'We noticed a login from Safari on macOS.',
            meta: { severity: 'info' },
            title: 'Login from Safari on macOS',
            type: 'security',
            userId: 7,
        })
        expect(notification).toEqual({
            actionLink: '/account/security',
            actionText: 'Review',
            description: 'We noticed a login from Safari on macOS.',
            id: 1,
            meta: { severity: 'info' },
            readAt: null,
            title: 'Login from Safari on macOS',
            type: 'security',
            userId: 7,
        })
    })

    it('rejects non-user recipients for database notifications', () => {
        expect(() => Notification.db().recipient('ada@example.com')).toThrow('Database notifications require a user recipient')
    })

    it('throws when database notification user is missing', async () => {
        await expect(Notification.db().send('Hello')).rejects.toThrow('No user recipient provided for database notification')
    })

    it('returns notification config defaults when config lookup throws', () => {
        mocks.config.mockImplementation(() => {
            throw new Error('config unavailable')
        })

        expect(configure('drivers.mail', { transport: 'smtp' })).toEqual({ transport: 'smtp' })
    })

    it('queries and mutates user notifications through the center', async () => {
        const user = { id: 12 }
        const notification = new UserNotification()
        notification.id = 99
        notification.readAt = null

        await expect(UserNotificationCenter.forUser(user)).resolves.toEqual([])
        expect(mocks.where).toHaveBeenLastCalledWith({ userId: 12 })
        expect(mocks.get).toHaveBeenCalledTimes(1)

        await expect(UserNotificationCenter.unreadForUser(user)).resolves.toEqual([])
        expect(mocks.where).toHaveBeenLastCalledWith({ userId: 12, readAt: null })
        expect(mocks.get).toHaveBeenCalledTimes(2)

        await UserNotificationCenter.markRead(notification)
        expect(mocks.where).toHaveBeenLastCalledWith({ id: 99 })
        expect(mocks.update).toHaveBeenLastCalledWith({ readAt: expect.any(Date) })
        expect(notification.readAt).toBeInstanceOf(Date)

        await UserNotificationCenter.markRead(100)
        expect(mocks.where).toHaveBeenLastCalledWith({ id: 100 })

        await UserNotificationCenter.markAllRead(user)
        expect(mocks.where).toHaveBeenLastCalledWith({ userId: 12, readAt: null })
        expect(mocks.update).toHaveBeenLastCalledWith({ readAt: expect.any(Date) })

        await UserNotificationCenter.delete(notification)
        expect(mocks.where).toHaveBeenLastCalledWith({ id: 99 })
        expect(mocks.deleteQuery).toHaveBeenCalledTimes(1)

        await UserNotificationCenter.delete(101)
        expect(mocks.where).toHaveBeenLastCalledWith({ id: 101 })
        expect(mocks.deleteQuery).toHaveBeenCalledTimes(2)
    })
})

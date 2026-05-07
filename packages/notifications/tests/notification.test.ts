import '@arkstack/view'

import { DbNotification, MailNotification, Notification, SmsNotification, interpolate } from '../src'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
    const sendMail = vi.fn(async payload => ({
        accepted: payload.to,
        messageId: 'test-message-id',
    }))
    const create = vi.fn(async payload => ({
        id: 1,
        readAt: null,
        ...payload,
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
        twilioCreate,
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
        createTransport: vi.fn(() => ({
            sendMail: mocks.sendMail,
        })),
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
})

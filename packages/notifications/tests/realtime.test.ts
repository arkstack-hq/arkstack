import { FirebaseRealtimeDriver, Notification, PusherRealtimeDriver, RealtimeNotification, UserNotificationCenter } from '../src'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RealtimeDriver } from '../src'

/** A fake transport that records what it was asked to broadcast. */
const fakeDriver = () => {
    const calls: Array<{ channel: string, event: string, payload: any, delivery?: any }> = []
    const driver: RealtimeDriver = {
        broadcast: vi.fn(async (channel, event, payload, delivery) => {
            calls.push({ channel, event, payload, delivery })

            return { ok: true }
        }),
        auth: vi.fn(async () => undefined),
        registerAuthRoute: vi.fn(async () => undefined),
    }

    return { driver, calls }
}

const withDriver = (notification: RealtimeNotification, driver: RealtimeDriver) => {
    notification.driver = driver as never

    return notification
}

const user = { id: 7 } as never

afterEach(() => vi.restoreAllMocks())

describe('RealtimeNotification', () => {
    it('broadcasts to the per-user channel with the default event', async () => {
        const { driver, calls } = fakeDriver()
        const rt = withDriver(Notification.realtime(), driver)

        const result = await rt
            .subject('Hello')
            .recipient(user)
            .send('You have a new message')

        expect(calls).toHaveLength(1)
        expect(calls[0].channel).toBe('user.7')
        expect(calls[0].event).toBe('notification')
        expect(calls[0].payload.title).toBe('Hello')
        expect(calls[0].payload.description).toBe('You have a new message')
        // A synthetic id + timestamp are produced when not persisting.
        expect(calls[0].payload.id).toEqual(expect.any(String))
        expect(calls[0].payload.read_at).toBeNull()

        expect(result.channel).toBe('user.7')
        expect(result.stored).toBeUndefined()
    })

    it('honours an explicit channel and event, and a string recipient', async () => {
        const { calls } = fakeDriver()
        const driver = { broadcast: vi.fn(async (c: string, e: string, p: any) => calls.push({ channel: c, event: e, payload: p })) }
        const rt = withDriver(Notification.realtime(), driver as never)

        await rt.recipient('team.updates').event('alert').send('Deploy finished')

        expect(calls[0].channel).toBe('team.updates')
        expect(calls[0].event).toBe('alert')
    })

    it('carries type, action and meta into the payload', async () => {
        const { driver, calls } = fakeDriver()
        const rt = withDriver(Notification.realtime(), driver)

        await rt
            .recipient(user)
            .type('security')
            .action('Review', 'https://example.test/login')
            .meta({ ip: '127.0.0.1' })
            .send('New login detected')

        expect(calls[0].payload).toMatchObject({
            type: 'security',
            actionText: 'Review',
            actionLink: 'https://example.test/login',
            meta: { ip: '127.0.0.1' },
        })
    })

    it('persists and uses the stored id/timestamps when store() is enabled', async () => {
        const created = { id: 42, readAt: null, createdAt: new Date('2026-01-02T03:04:05.000Z') }
        const spy = vi.spyOn(UserNotificationCenter, 'create').mockResolvedValue(created as never)

        const { driver, calls } = fakeDriver()
        const rt = withDriver(Notification.realtime(), driver)

        const result = await rt.recipient(user).store().send('Stored + broadcast')

        expect(spy).toHaveBeenCalledOnce()
        expect(calls[0].payload.id).toBe('42')
        expect(calls[0].payload.created_at).toBe('2026-01-02T03:04:05.000Z')
        expect(result.stored).toBe(created)
    })

    it('throws when no user or channel is provided', async () => {
        const { driver } = fakeDriver()
        const rt = withDriver(Notification.realtime(), driver)

        await expect(rt.send('nowhere')).rejects.toThrow(/channel/i)
    })

    it('passes an array channel through to the transport (multi-channel / tokens)', async () => {
        const { driver, calls } = fakeDriver()
        const rt = withDriver(Notification.realtime(), driver)

        const result = await rt.channel(['token-a', 'token-b']).send('Hi')

        expect(calls[0].channel).toEqual(['token-a', 'token-b'])
        expect(result.channel).toEqual(['token-a', 'token-b'])
    })
})

describe('FirebaseRealtimeDriver multicast', () => {
    /** Inject a fake `firebase-admin` messaging into the lazy promise. */
    const withMessaging = (messaging: unknown) => {
        const driver = new FirebaseRealtimeDriver();
        (driver as any).messagingPromise = Promise.resolve(messaging)

        return driver
    }

    const payload = () => ({
        id: '1', type: null, title: 'T', description: 'D', read_at: null, created_at: '2026-01-01T00:00:00.000Z',
    })

    it('provides no-op auth methods without initializing Firebase Admin', async () => {
        const driver = new FirebaseRealtimeDriver()

        await expect(driver.auth('socket-id', 'user.7')).resolves.toBeUndefined()
        await expect(driver.registerAuthRoute()).resolves.toBeUndefined()
        await expect(FirebaseRealtimeDriver.registerAuthRoute()).resolves.toBeUndefined()
        expect((driver as any).messagingPromise).toBeUndefined()
    })

    it('sends a single channel as an FCM topic', async () => {
        const send = vi.fn(async () => 'msg-id')
        const driver = withMessaging({ send, sendEachForMulticast: vi.fn() })

        await driver.broadcast('user.7', 'notification', payload())

        expect(send).toHaveBeenCalledWith(expect.objectContaining({ topic: 'user.7' }))
    })

    it('chunks tokens to 500 per multicast and reports dead tokens to prune', async () => {
        const tokens = Array.from({ length: 501 }, (_, i) => `t${i}`)
        const sendEachForMulticast = vi.fn(async ({ tokens: batch }: { tokens: string[] }) => ({
            successCount: batch.length - (batch.includes('t0') ? 1 : 0),
            failureCount: batch.includes('t0') ? 1 : 0,
            responses: batch.map((t) => t === 't0'
                ? { success: false, error: { code: 'messaging/registration-token-not-registered' } }
                : { success: true }),
        }))
        const driver = withMessaging({ send: vi.fn(), sendEachForMulticast })

        const result = await driver.broadcast(tokens, 'notification', payload()) as {
            successCount: number
            failureCount: number
            invalidTokens: string[]
        }

        // 501 tokens → two batches (500 + 1).
        expect(sendEachForMulticast).toHaveBeenCalledTimes(2)
        expect(sendEachForMulticast.mock.calls[0][0].tokens).toHaveLength(500)
        expect(sendEachForMulticast.mock.calls[1][0].tokens).toHaveLength(1)
        // The dead token is surfaced for pruning.
        expect(result.invalidTokens).toEqual(['t0'])
        expect(result.failureCount).toBe(1)
        expect(result.successCount).toBe(500)
    })
})

describe('realtime delivery options', () => {
    /** Inject a fake `firebase-admin` messaging into the lazy promise. */
    const withMessaging = (messaging: unknown, options = {}) => {
        const driver = new FirebaseRealtimeDriver(options);
        (driver as any).messagingPromise = Promise.resolve(messaging)

        return driver
    }

    const payload = () => ({
        id: '1', type: null, title: 'T', description: 'D', read_at: null, created_at: '2026-01-01T00:00:00.000Z',
    })

    const sent = async (delivery: any, options = {}) => {
        const send = vi.fn(async (_message: Record<string, any>) => 'msg-id')
        const driver = withMessaging({ send, sendEachForMulticast: vi.fn() }, options)

        await driver.broadcast('user.7', 'notification', payload(), delivery)

        return send.mock.calls[0][0]
    }

    it('forwards the builder\'s delivery hints to the transport', async () => {
        const { driver, calls } = fakeDriver()
        const rt = withDriver(Notification.realtime(), driver)

        await rt.recipient(user).priority('high').ttl(45).collapseKey('call-42').send('Incoming call')

        expect(calls[0].delivery).toEqual({ priority: 'high', ttl: 45, collapseKey: 'call-42' })
    })

    it('defaults priority() to high, since that is the only reason to call it', async () => {
        const { driver, calls } = fakeDriver()
        const rt = withDriver(Notification.realtime(), driver)

        await rt.recipient(user).priority().send('Incoming call')

        expect(calls[0].delivery).toEqual({ priority: 'high' })
    })

    it('sends nothing but data when no delivery hints are given', async () => {
        const message = await sent(undefined)

        // Back-compat: an unhinted broadcast is byte-for-byte what it always was.
        expect(message).toEqual({ topic: 'user.7', data: { event: 'notification', payload: expect.any(String) } })
        expect(message).not.toHaveProperty('android')
        expect(message).not.toHaveProperty('apns')
        expect(message).not.toHaveProperty('webpush')
    })

    it('maps high priority onto Android and Web Push', async () => {
        const message = await sent({ priority: 'high' })

        expect(message.android).toEqual({ priority: 'high' })
        expect(message.webpush).toEqual({ headers: { Urgency: 'high' } })
    })

    it('leaves APNs priority alone on a data-only push, which iOS treats as background', async () => {
        const message = await sent({ priority: 'high' })

        // Apple requires a background push to be priority 5 or 1, so deriving 10
        // here would send APNs something it is documented to reject.
        expect(message).not.toHaveProperty('apns')
    })

    it('derives an APNs priority once the caller declares a visible push', async () => {
        const message = await sent({
            priority: 'high',
            apns: { headers: { 'apns-push-type': 'alert' } },
        })

        expect(message.apns.headers).toEqual({ 'apns-push-type': 'alert', 'apns-priority': '10' })
    })

    it('recognises a visible push from an alert payload alone', async () => {
        const message = await sent({
            priority: 'high',
            apns: { payload: { aps: { alert: { title: 'Approve sign-in' } } } },
        })

        expect(message.apns.headers).toEqual({ 'apns-priority': '10' })
    })

    it('maps normal priority to 5 on a visible push', async () => {
        const message = await sent({
            priority: 'normal',
            apns: { headers: { 'apns-push-type': 'alert' } },
        })

        expect(message.apns.headers).toEqual({ 'apns-push-type': 'alert', 'apns-priority': '5' })
    })

    it('does not derive a priority for a push the caller declared as background', async () => {
        const message = await sent({
            priority: 'high',
            apns: { headers: { 'apns-push-type': 'background' } },
        })

        expect(message.apns.headers).toEqual({ 'apns-push-type': 'background' })
    })

    it('still lets the caller set an APNs priority the rule would not derive', async () => {
        const message = await sent({
            priority: 'high',
            apns: { headers: { 'apns-priority': '5' } },
        })

        expect(message.apns.headers).toEqual({ 'apns-priority': '5' })
    })

    it('converts a TTL to each platform\'s own unit', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

        try {
            const message = await sent({ ttl: 45 })

            // Android takes a duration in milliseconds.
            expect(message.android).toEqual({ ttl: 45_000 })
            // APNs takes an absolute UNIX second: 1767225600 is the epoch second
            // for 2026-01-01T00:00:00Z.
            expect(message.apns).toEqual({ headers: { 'apns-expiration': String(1767225600 + 45) } })
            // Web Push takes a duration in seconds.
            expect(message.webpush).toEqual({ headers: { TTL: '45' } })
        } finally {
            vi.useRealTimers()
        }
    })

    it('treats a zero TTL as now-or-never rather than as the epoch', async () => {
        const message = await sent({ ttl: 0 })

        expect(message.android).toEqual({ ttl: 0 })
        expect(message.apns).toEqual({ headers: { 'apns-expiration': '0' } })
    })

    it('carries a collapse key to both Android and APNs', async () => {
        const message = await sent({ collapseKey: 'call-42' })

        expect(message.android).toEqual({ collapseKey: 'call-42' })
        expect(message.apns).toEqual({ headers: { 'apns-collapse-id': 'call-42' } })
    })

    it('lets the raw escape hatches override what it derives', async () => {
        const message = await sent({
            priority: 'high',
            collapseKey: 'call-42',
            android: { priority: 'normal', restrictedPackageName: 'com.example' },
            apns: { headers: { 'apns-push-type': 'voip' }, payload: { aps: { 'content-available': 1 } } },
        })

        // The override replaces `priority` and adds its own key; the derived
        // `collapseKey` it said nothing about survives underneath.
        expect(message.android).toEqual({
            priority: 'normal', collapseKey: 'call-42', restrictedPackageName: 'com.example',
        })
        expect(message.apns).toEqual({
            headers: { 'apns-collapse-id': 'call-42', 'apns-push-type': 'voip' },
            payload: { aps: { 'content-available': 1 } },
        })
    })

    it('merges transport defaults under the per-send options', async () => {
        const message = await sent({ ttl: 30 }, { delivery: { priority: 'high', ttl: 600 } })

        expect(message.android).toEqual({ priority: 'high', ttl: 30_000 })
    })

    it('applies delivery options to every multicast batch', async () => {
        const sendEachForMulticast = vi.fn(async ({ tokens }: { tokens: string[] }) => ({
            successCount: tokens.length, failureCount: 0, responses: tokens.map(() => ({ success: true })),
        }))
        const driver = withMessaging({ send: vi.fn(), sendEachForMulticast })
        const tokens = Array.from({ length: 501 }, (_, i) => `t${i}`)

        await driver.broadcast(tokens, 'notification', payload(), { priority: 'high' })

        expect(sendEachForMulticast).toHaveBeenCalledTimes(2)
        for (const [message] of sendEachForMulticast.mock.calls) {
            expect((message as any).android).toEqual({ priority: 'high' })
        }
    })

    it('ignores delivery options on Pusher without throwing', async () => {
        const trigger = vi.fn(async () => ({ ok: true }))
        const driver = new PusherRealtimeDriver();
        (driver as any).clientPromise = Promise.resolve({ trigger })

        await driver.broadcast('user.7', 'notification', payload(), { priority: 'high' })

        expect(trigger).toHaveBeenCalledWith('user.7', 'notification', expect.objectContaining({ id: '1' }))
    })
})

describe('notification supersession', () => {
    it('carries a tag on the payload so a client can replace what it showed', async () => {
        const { driver, calls } = fakeDriver()
        const rt = withDriver(Notification.realtime(), driver)

        await rt.recipient(user).tag('call:42').send('Incoming call')

        expect(calls[0].payload.tag).toBe('call:42')
        expect(calls[0].payload.retracted).toBeUndefined()
    })

    it('omits both fields entirely when untagged', async () => {
        const { driver, calls } = fakeDriver()
        const rt = withDriver(Notification.realtime(), driver)

        await rt.recipient(user).send('Hello')

        // Untagged broadcasts stay byte-for-byte what they were on the wire.
        expect(calls[0].payload).not.toHaveProperty('tag')
        expect(calls[0].payload).not.toHaveProperty('retracted')
    })

    it('marks a retraction and lets it send with nothing to display', async () => {
        const { driver, calls } = fakeDriver()
        const rt = withDriver(Notification.realtime(), driver)

        await rt.recipient(user).tag('call:42').retract().send()

        expect(calls[0].payload.tag).toBe('call:42')
        expect(calls[0].payload.retracted).toBe(true)
        expect(calls[0].payload.description).toBe('')
    })

    it('does not leave a retraction behind in stored history', async () => {
        const create = vi.spyOn(UserNotificationCenter, 'create')
        const { driver, calls } = fakeDriver()
        const rt = withDriver(Notification.realtime(), driver)

        const result = await rt.recipient(user).tag('call:42').store().retract().send()

        // Storing a withdrawal as a notification would make history say the
        // opposite of what happened.
        expect(create).not.toHaveBeenCalled()
        expect(result.stored).toBeUndefined()
        expect(calls[0].payload.retracted).toBe(true)
    })

    it('leaves tag and collapseKey independent, since their budgets differ', async () => {
        const { driver, calls } = fakeDriver()
        const rt = withDriver(Notification.realtime(), driver)

        await rt.recipient(user).tag('call:42').send('Incoming call')

        // FCM keeps only four collapse keys per device, so a tag must never
        // quietly become one.
        expect(calls[0].delivery?.collapseKey).toBeUndefined()
    })
})

describe('custom realtime drivers', () => {
    it('broadcasts through a driver supplied by the caller', async () => {
        const { driver, calls } = fakeDriver()

        const rt = Notification.realtime({ driverFactory: () => driver })
        await rt.recipient(user).send('Hello')

        expect(calls).toHaveLength(1)
        expect(calls[0].channel).toBe('user.7')
    })

    it('ignores `transport` when a driver is supplied, rather than building both', async () => {
        const { driver, calls } = fakeDriver()
        const factory = vi.fn(() => driver)

        const rt = Notification.realtime({ transport: 'firebase', driverFactory: factory })
        await rt.recipient(user).send('Hello')

        expect(factory).toHaveBeenCalledTimes(1)
        expect(rt.driver).toBe(driver)
        expect(calls).toHaveLength(1)
    })

    it('still builds a built-in when no driver is supplied', async () => {
        expect(Notification.realtime({ transport: 'firebase' }).driver)
            .toBeInstanceOf(FirebaseRealtimeDriver)
        expect(Notification.realtime({ transport: 'pusher' }).driver)
            .toBeInstanceOf(PusherRealtimeDriver)
    })

    it('carries a payload that is not shaped like a notification', async () => {
        const calls: Array<{ event: string, payload: any }> = []
        const driver: RealtimeDriver = {
            broadcast: vi.fn(async (_channel, event, payload) => {
                calls.push({ event, payload })
            }),
            auth: vi.fn(async () => undefined),
            registerAuthRoute: vi.fn(async () => undefined),
        }

        // A channel is just a channel: an application can push its own event
        // shapes over it and pick them up with the client's `listen()`.
        await driver.broadcast('user.7', 'call.invite', { callId: 'c-1', room: 'r-9', expiresAt: 1767225600 })

        expect(calls[0].event).toBe('call.invite')
        expect(calls[0].payload).toEqual({ callId: 'c-1', room: 'r-9', expiresAt: 1767225600 })
    })
})

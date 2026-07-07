import { FirebaseRealtimeDriver, Notification, RealtimeNotification, UserNotificationCenter } from '../src'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RealtimeDriver } from '../src'

/** A fake transport that records what it was asked to broadcast. */
const fakeDriver = () => {
    const calls: Array<{ channel: string, event: string, payload: any }> = []
    const driver: RealtimeDriver = {
        broadcast: vi.fn(async (channel, event, payload) => {
            calls.push({ channel, event, payload })

            return { ok: true }
        }),
    }

    return { driver, calls }
}

const withDriver = (notification: RealtimeNotification, driver: RealtimeDriver) => {
    notification.driver = driver

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
        const driver = new FirebaseRealtimeDriver()
        ;(driver as unknown as { messagingPromise: Promise<unknown> }).messagingPromise = Promise.resolve(messaging)

        return driver
    }

    const payload = () => ({
        id: '1', type: null, title: 'T', description: 'D', read_at: null, created_at: '2026-01-01T00:00:00.000Z',
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

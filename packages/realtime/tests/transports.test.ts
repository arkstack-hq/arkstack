import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFirebaseDatabaseTransport, createRealtime, emitMemoryEvent } from '../src'

const fakes = vi.hoisted(() => ({
    pusherOptions: [] as Array<Record<string, unknown>>,
    childListeners: new Map<string, (snapshot: { val(): unknown }) => void>(),
    queries: [] as unknown[][],
    signIns: [] as string[],
    currentUser: null as { uid: string } | null,
    signedOut: 0,
}))

vi.mock('pusher-js', () => ({
    default: class {
        constructor(_key: string, options: Record<string, unknown>) {
            fakes.pusherOptions.push(options)
        }

        subscribe() {
            return { bind() { }, unbind() { }, trigger: () => true }
        }

        unsubscribe() { }

        disconnect() { }
    },
}))

vi.mock('firebase/app', () => ({
    initializeApp: vi.fn((_options: unknown, name = '[DEFAULT]') => ({ name })),
    getApps: vi.fn(() => []),
}))

vi.mock('firebase/messaging', () => ({
    getMessaging: vi.fn(() => ({})),
    onMessage: vi.fn(() => vi.fn()),
    getToken: vi.fn(async (_messaging: unknown, options?: { vapidKey?: string }) => `fcm-token:${options?.vapidKey}`),
}))

vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({
        get currentUser() {
            return fakes.currentUser
        },
    })),
    signInWithCustomToken: vi.fn(async (_auth: unknown, token: string) => {
        fakes.signIns.push(token)
        fakes.currentUser = { uid: JSON.parse(atob(token.split('.')[1])).uid }
    }),
    signOut: vi.fn(async () => {
        fakes.signedOut++
        fakes.currentUser = null
    }),
}))

vi.mock('firebase/database', () => ({
    getDatabase: vi.fn(() => ({})),
    ref: vi.fn((_database: unknown, path: string) => ({ path })),
    query: vi.fn((reference: { path: string }, ...constraints: unknown[]) => {
        fakes.queries.push(constraints)

        return reference
    }),
    orderByChild: vi.fn((path: string) => ({ orderByChild: path })),
    startAt: vi.fn((value: number) => ({ startAt: value })),
    onValue: vi.fn((_reference: unknown, handler: (snapshot: { val(): unknown }) => void) => {
        handler({ val: () => 250 })

        return vi.fn()
    }),
    onChildAdded: vi.fn((reference: { path: string }, handler: (snapshot: { val(): unknown }) => void) => {
        fakes.childListeners.set(reference.path, handler)

        return () => fakes.childListeners.delete(reference.path)
    }),
}))

/** A Firebase custom token whose payload carries `uid`. */
const customToken = (uid: string) => `header.${btoa(JSON.stringify({ uid }))}.signature`

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    fakes.pusherOptions.length = 0
    fakes.childListeners.clear()
    fakes.queries.length = 0
    fakes.signIns.length = 0
    fakes.currentUser = null
    fakes.signedOut = 0
})

describe('polling transport', () => {
    it('runs poll handlers on the advertised interval until stopped', async () => {
        vi.useFakeTimers()
        const client = createRealtime({ transport: 'polling', polling: { interval: 1000 } })
        const handler = vi.fn()

        const stop = await client.onPoll(handler)
        vi.advanceTimersByTime(3000)
        stop()
        vi.advanceTimersByTime(3000)

        expect(handler).toHaveBeenCalledTimes(3)
    })

    it('accepts subscriptions that never fire', async () => {
        const client = createRealtime({ transport: 'polling' })
        const handler = vi.fn()

        const off = await client.forUser(1, handler)
        off()

        expect(handler).not.toHaveBeenCalled()
    })

    it('does not poll on push transports', async () => {
        vi.useFakeTimers()
        const client = createRealtime({ transport: 'memory' })
        const handler = vi.fn()

        await client.onPoll(handler, 10)
        vi.advanceTimersByTime(100)

        expect(handler).not.toHaveBeenCalled()
    })
})

describe('memory transport', () => {
    it('delivers emitted events to matching subscribers only', async () => {
        const client = createRealtime({ transport: 'memory' })
        const notifications = vi.fn()
        const custom = vi.fn()

        await client.forUser(5, notifications)
        await client.listen('team.1', 'deploy', custom)

        emitMemoryEvent('user.5', 'notification', { id: 'n1' })
        emitMemoryEvent('user.5', 'other', { id: 'ignored' })
        emitMemoryEvent('team.1', 'deploy', { ok: true })
        emitMemoryEvent('team.2', 'deploy', { ok: false })

        expect(notifications).toHaveBeenCalledWith({ id: 'n1' })
        expect(notifications).toHaveBeenCalledTimes(1)
        expect(custom).toHaveBeenCalledWith({ ok: true })
        expect(custom).toHaveBeenCalledTimes(1)
    })

    it('stops delivering after disconnect', async () => {
        const client = createRealtime({ transport: 'memory' })
        const handler = vi.fn()

        await client.forUser(6, handler)
        await client.disconnect()
        emitMemoryEvent('user.6', 'notification', {})

        expect(handler).not.toHaveBeenCalled()
    })

    it('reports no device token', async () => {
        await expect(createRealtime({ transport: 'memory' }).deviceToken()).resolves.toBeNull()
    })
})

describe('pusher transport', () => {
    it('connects to a self-hosted server when wsHost is set', async () => {
        const client = createRealtime({
            transport: 'pusher',
            pusher: { key: 'k', apiBase: '/api', wsHost: 'soketi.test', wsPort: 6001, forceTLS: false },
        })

        await client.forUser(1, vi.fn())

        expect(fakes.pusherOptions[0]).toMatchObject({
            wsHost: 'soketi.test',
            wsPort: 6001,
            wssPort: 6001,
            enabledTransports: ['ws', 'wss'],
            authEndpoint: '/api/realtime/auth',
        })
    })

    it('leaves hosted Pusher addressing alone', async () => {
        await createRealtime({ transport: 'pusher', pusher: { key: 'k', cluster: 'eu' } }).forUser(1, vi.fn())

        expect(fakes.pusherOptions[0]).not.toHaveProperty('wsHost')
        expect(fakes.pusherOptions[0].cluster).toBe('eu')
    })
})

describe('firebase messaging transport', () => {
    it('issues a device token with the VAPID key', async () => {
        const client = createRealtime({
            transport: 'firebase',
            firebase: { apiKey: 'a', projectId: 'p', appId: 'i', messagingSenderId: 'm', vapidKey: 'v' },
        })

        await expect(client.deviceToken()).resolves.toBe('fcm-token:v')
    })
})

describe('firebase database transport', () => {
    const config = {
        apiKey: 'a',
        projectId: 'p',
        databaseURL: 'https://p.firebaseio.com',
        apiBase: '/api',
        auth: { headers: { Authorization: 'Bearer t' } },
    }

    const stubAuth = (uid = 'u-1', ok = true) => {
        const fetch = vi.fn(async () => ({
            ok,
            status: ok ? 200 : 403,
            json: async () => ({ token: customToken(uid) }),
        }))
        vi.stubGlobal('fetch', fetch)

        return fetch
    }

    it('authorizes the channel, signs in once, and delivers matching events', async () => {
        const fetch = stubAuth()
        vi.spyOn(Date, 'now').mockReturnValue(10_000)
        const transport = await createFirebaseDatabaseTransport(config)
        const handler = vi.fn()

        await transport.subscribe('private-user.1', 'notification', handler)
        await transport.subscribe('private-team.2', 'notification', vi.fn())

        expect(fetch).toHaveBeenCalledWith('/api/realtime/auth', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ channel_name: 'private-user.1' }),
            headers: expect.objectContaining({ Authorization: 'Bearer t' }),
        }))
        expect(fakes.signIns).toHaveLength(1)
        // Only events written after connecting, on the server clock.
        expect(fakes.queries[0]).toEqual([{ orderByChild: 'at' }, { startAt: 10_250 }])

        const emit = fakes.childListeners.get('arkstack/channels/private-user%2E1')!
        emit({ val: () => ({ event: 'notification', payload: { id: 'n1' } }) })
        emit({ val: () => ({ event: 'other', payload: { id: 'n2' } }) })

        expect(handler).toHaveBeenCalledWith({ id: 'n1' })
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it('signs in again when the token belongs to a different user', async () => {
        stubAuth('u-2')
        fakes.currentUser = { uid: 'u-1' }
        const transport = await createFirebaseDatabaseTransport(config)

        await transport.subscribe('private-user.2', 'notification', vi.fn())

        expect(fakes.signIns).toEqual([customToken('u-2')])
    })

    it('rejects a channel the API refuses', async () => {
        stubAuth('u-1', false)
        const transport = await createFirebaseDatabaseTransport(config)

        await expect(transport.subscribe('private-user.9', 'notification', vi.fn())).rejects.toThrow(/not authorized \(403\)/)
        expect(fakes.childListeners.size).toBe(0)
    })

    it('stops listening and signs out on disconnect', async () => {
        stubAuth()
        const transport = await createFirebaseDatabaseTransport(config)

        await transport.subscribe('private-user.1', 'notification', vi.fn())
        await transport.disconnect()

        expect(fakes.childListeners.size).toBe(0)
        expect(fakes.signedOut).toBe(1)
    })
})

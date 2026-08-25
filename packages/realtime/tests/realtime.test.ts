import { describe, expect, it, vi } from 'vitest'

import type { NotificationHandler, RealtimeNotification, RealtimeTransport } from '../src'
import { createFirebaseTransport, createRealtime } from '../src'

const firebaseDatabase = vi.hoisted(() => {
    const listeners = new Map<string, Set<(snapshot: { val(): unknown }) => void>>()
    const removed: string[] = []

    return { listeners, removed }
})

vi.mock('firebase/app', () => ({
    initializeApp: vi.fn(() => ({})),
}))

vi.mock('firebase/messaging', () => ({
    getMessaging: vi.fn(() => ({})),
    onMessage: vi.fn(() => vi.fn()),
}))

vi.mock('firebase/database', () => ({
    getDatabase: vi.fn(() => ({})),
    ref: vi.fn((_database: unknown, path: string) => ({ path })),
    onChildAdded: vi.fn((reference: { path: string }, handler: (snapshot: { val(): unknown }) => void) => {
        const handlers = firebaseDatabase.listeners.get(reference.path) ?? new Set()
        handlers.add(handler)
        firebaseDatabase.listeners.set(reference.path, handlers)

        return () => handlers.delete(handler)
    }),
    push: vi.fn(async (reference: { path: string }, payload: unknown) => {
        firebaseDatabase.listeners.get(reference.path)?.forEach((handler) => handler({ val: () => payload }))

        return { path: `${reference.path}/generated-key` }
    }),
    remove: vi.fn(async (reference: { path: string }) => {
        firebaseDatabase.removed.push(reference.path)
    }),
}))

/** A fake transport that lets a test push notifications into subscribers. */
const fakeTransport = () => {
    const handlers = new Map<string, Set<NotificationHandler>>()
    const unsubscribed: string[] = []
    let disconnected = false
    const triggered: Array<{ channel: string, event: string, payload: unknown }> = []

    const transport: RealtimeTransport = {
        subscribe (channel, _event, handler) {
            const set = handlers.get(channel) ?? new Set()
            set.add(handler)
            handlers.set(channel, set)

            return {
                channel,
                unsubscribe () {
                    set.delete(handler)
                    unsubscribed.push(channel)
                },
            }
        },
        trigger (channel, event, payload) {
            triggered.push({ channel, event, payload })
        },
        disconnect () {
            disconnected = true
        },
    }

    const emit = (channel: string, notification: RealtimeNotification) => {
        handlers.get(channel)?.forEach((h) => h(notification))
    }

    return { transport, emit, triggered, unsubscribed, isDisconnected: () => disconnected }
}

const sample = (over: Partial<RealtimeNotification> = {}): RealtimeNotification => ({
    id: '1',
    type: null,
    title: 'Hi',
    description: 'A message',
    read_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...over,
})

describe('RealtimeClient', () => {
    it('subscribes and delivers notifications to the handler', async () => {
        const { transport, emit } = fakeTransport()
        const client = createRealtime({ transportFactory: () => transport })

        const received: RealtimeNotification[] = []
        await client.subscribe('user.7', (n) => received.push(n))

        emit('user.7', sample({ id: 'a' }))
        emit('user.7', sample({ id: 'b' }))

        expect(received.map((n) => n.id)).toEqual(['a', 'b'])
    })

    it('resolves the per-user channel via forUser + channelFor', async () => {
        const { transport, emit } = fakeTransport()
        const client = createRealtime({ transportFactory: () => transport, channelPrefix: 'user.' })

        expect(client.channelFor(7)).toBe('user.7')

        const received: string[] = []
        await client.forUser(7, (n) => received.push(n.id))
        emit('user.7', sample({ id: 'z' }))

        expect(received).toEqual(['z'])
    })

    it('unsubscribe stops further delivery', async () => {
        const { transport, emit, unsubscribed } = fakeTransport()
        const client = createRealtime({ transportFactory: () => transport })

        const received: string[] = []
        const off = await client.subscribe('user.7', (n) => received.push(n.id))

        emit('user.7', sample({ id: 'a' }))
        off()
        emit('user.7', sample({ id: 'b' }))

        expect(received).toEqual(['a'])
        expect(unsubscribed).toContain('user.7')
    })

    it('listens for and emits client events with the client prefix', async () => {
        const { transport, triggered } = fakeTransport()
        const subscribe = vi.spyOn(transport, 'subscribe')
        const client = createRealtime({ transportFactory: () => transport })
        const typing: Array<{ userId: number }> = []

        await client.listenForWhisper<{ userId: number }>('private-room.7', 'typing', (payload) => typing.push(payload))
        await client.whisper('private-room.7', 'typing', { userId: 7 })

        expect(subscribe).toHaveBeenCalledWith('private-room.7', 'client-typing', expect.any(Function))
        expect(triggered).toEqual([{
            channel: 'private-room.7',
            event: 'client-typing',
            payload: { userId: 7 },
        }])
    })

    it('reports transports that do not support client events', async () => {
        const { transport } = fakeTransport()
        delete transport.trigger
        const client = createRealtime({ transportFactory: () => transport })

        await expect(client.whisper('private-room.7', 'typing', {})).rejects.toThrow(/does not support client events/i)
    })

    it('resolves the transport once and disconnects it', async () => {
        const factory = vi.fn(() => fakeTransport().transport)
        const client = createRealtime({ transportFactory: factory })

        await client.subscribe('a', () => undefined)
        await client.subscribe('b', () => undefined)
        expect(factory).toHaveBeenCalledOnce()

        await client.disconnect()
        // A fresh subscribe re-resolves the transport after disconnect.
        await client.subscribe('c', () => undefined)
        expect(factory).toHaveBeenCalledTimes(2)
    })

    it('throws a helpful error when a transport config is missing', async () => {
        const client = createRealtime({ transport: 'pusher' })

        await expect(client.subscribe('user.7', () => undefined)).rejects.toThrow(/pusher/i)
    })
})

describe('Firebase client events', () => {
    it('publishes client events through Realtime Database with channel isolation', async () => {
        firebaseDatabase.listeners.clear()
        firebaseDatabase.removed.length = 0
        const receiver = await createFirebaseTransport({
            apiKey: 'key',
            projectId: 'project',
            appId: 'app',
            messagingSenderId: 'sender',
        })
        const sender = await createFirebaseTransport({
            apiKey: 'key',
            projectId: 'project',
            appId: 'app',
            messagingSenderId: 'sender',
        })
        const received: Array<{ userId: number }> = []
        const otherChannel: Array<{ userId: number }> = []
        const subscription = await receiver.subscribe(
            'private-room.7',
            'client-typing',
            (payload) => received.push(payload as { userId: number }),
        )
        await receiver.subscribe(
            'private-room.8',
            'client-typing',
            (payload) => otherChannel.push(payload as { userId: number }),
        )

        await sender.trigger?.('private-room.7', 'client-typing', { userId: 7 })
        expect(received).toEqual([{ userId: 7 }])
        expect(otherChannel).toEqual([])
        expect(firebaseDatabase.removed).toEqual([
            'arkstack/client-events/private-room%2E7/client-typing/generated-key',
        ])

        subscription.unsubscribe()
        await sender.trigger?.('private-room.7', 'client-typing', { userId: 8 })
        expect(received).toEqual([{ userId: 7 }])
    })
})

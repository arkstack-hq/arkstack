import { describe, expect, it, vi } from 'vitest'

import type { NotificationHandler, RealtimeNotification, RealtimeTransport } from '../src'
import { createRealtime } from '../src'

/** A fake transport that lets a test push notifications into subscribers. */
const fakeTransport = () => {
    const handlers = new Map<string, Set<NotificationHandler>>()
    const unsubscribed: string[] = []
    let disconnected = false

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
        disconnect () {
            disconnected = true
        },
    }

    const emit = (channel: string, notification: RealtimeNotification) => {
        handlers.get(channel)?.forEach((h) => h(notification))
    }

    return { transport, emit, unsubscribed, isDisconnected: () => disconnected }
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

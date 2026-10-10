import type { RealtimeEventHandler, RealtimeTransport } from '../types'

type Listener = { event: string, handler: RealtimeEventHandler }

const BUS_KEY = Symbol.for('arkstack.realtime.client-memory')

/**
 * The in-process bus, kept on `globalThis` so every module copy shares it.
 *
 * @returns
 */
const bus = (): Map<string, Set<Listener>> => {
    const store = globalThis as Record<symbol, Map<string, Set<Listener>> | undefined>

    return (store[BUS_KEY] ??= new Map())
}

/**
 * Deliver an event to every in-process subscriber of `channel`, as a server
 * broadcast would.
 *
 * @param channel
 * @param event
 * @param payload
 */
export const emitMemoryEvent = (channel: string, event: string, payload: unknown): void => {
    bus().get(channel)?.forEach((listener) => {
        if (listener.event === event) listener.handler(payload)
    })
}

/**
 * An in-process transport for tests. Feed it with {@link emitMemoryEvent}.
 *
 * @returns
 */
export const createMemoryTransport = (): RealtimeTransport => {
    const own = new Set<{ channel: string, listener: Listener }>()

    return {
        subscribe(channel: string, event: string, handler: RealtimeEventHandler) {
            const listener = { event, handler }
            const listeners = bus().get(channel) ?? new Set()
            const entry = { channel, listener }

            listeners.add(listener)
            bus().set(channel, listeners)
            own.add(entry)

            return {
                channel,
                unsubscribe() {
                    listeners.delete(listener)
                    own.delete(entry)
                },
            }
        },
        trigger(channel: string, event: string, payload: unknown) {
            emitMemoryEvent(channel, event, payload)
        },
        disconnect() {
            own.forEach(({ channel, listener }) => bus().get(channel)?.delete(listener))
            own.clear()
        },
    }
}

import type { RealtimeBroadcastPayload, RealtimeDeliveryOptions } from '../../types'

import type { RealtimeDriver } from '../../Contracts/RealtimeDriver'

/** 
 * A broadcast recorded by {@link MemoryRealtimeDriver}. 
 */
export interface RecordedBroadcast {
    channel: string | string[]
    event: string
    payload: RealtimeBroadcastPayload
    delivery?: RealtimeDeliveryOptions
}

const BUFFER_KEY = Symbol.for('arkstack.realtime.memory')

/**
 * The recorded broadcasts. Kept on `globalThis` so code loaded through separate
 * module graphs (an app's routes and its tests, say) shares one buffer.
 *
 * @returns
 */
const buffer = (): RecordedBroadcast[] => {
    const store = globalThis as Record<symbol, RecordedBroadcast[] | undefined>

    return (store[BUFFER_KEY] ??= [])
}

/**
 * Records every broadcast in process instead of sending it, for tests and local
 * development. Read them with {@link MemoryRealtimeDriver.broadcasts}.
 */
export class MemoryRealtimeDriver implements RealtimeDriver {
    /**
     * Every broadcast recorded since the last {@link clear}.
     *
     * @returns
     */
    static broadcasts(): RecordedBroadcast[] {
        return buffer()
    }

    /**
     * Forget all recorded broadcasts.
     */
    static clear(): void {
        buffer().length = 0
    }

    async broadcast(
        channel: string | string[],
        event: string,
        payload: RealtimeBroadcastPayload,
        delivery?: RealtimeDeliveryOptions,
    ): Promise<void> {
        buffer().push({ channel, event, payload, delivery })
    }

    async auth(_socketId: string, channel: string): Promise<{ auth: string }> {
        return { auth: `memory:${channel}` }
    }

    async registerAuthRoute(): Promise<void> { }

    clientConfig(): Record<string, unknown> {
        return {}
    }
}

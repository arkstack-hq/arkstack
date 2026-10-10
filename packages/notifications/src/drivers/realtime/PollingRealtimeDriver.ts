import type { PollingTransportConfig, RealtimeBroadcastPayload, RealtimeDeliveryOptions } from '../../types'

import type { RealtimeDriver } from '../../Contracts/RealtimeDriver'

/**
 * A transport that pushes nothing. Clients are told to poll on an interval
 * instead, so an app works without realtime infrastructure.
 */
export class PollingRealtimeDriver implements RealtimeDriver {
    constructor(private options: PollingTransportConfig = {}) { }

    async broadcast(
        _channel: string | string[],
        _event: string,
        _payload: RealtimeBroadcastPayload,
        _delivery?: RealtimeDeliveryOptions,
    ): Promise<void> { }

    async auth(): Promise<Record<string, never>> {
        return {}
    }

    async registerAuthRoute(): Promise<void> { }

    clientConfig(): Record<string, unknown> {
        return { interval: this.options.interval ?? 5000 }
    }
}

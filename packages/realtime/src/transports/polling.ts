import type { PollingClientConfig, RealtimeTransport } from '../types'

/**
 * A transport that receives nothing. Subscriptions are accepted and stay
 * silent; use {@link RealtimeClient.onPoll} to refetch on the advertised interval.
 *
 * @param config
 * @returns
 */
export const createPollingTransport = (config: PollingClientConfig = {}): RealtimeTransport => ({
  polling: { interval: config.interval ?? 5000 },
  subscribe(channel: string) {
    return { channel, unsubscribe() {} }
  },
  disconnect() {},
})

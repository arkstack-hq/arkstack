import type { RealtimeNotificationPayload } from '../types'

/**
 * A realtime transport (Pusher, Firebase, …) broadcasts a notification payload
 * to a channel/topic that connected clients subscribe to.
 *
 * `channel` may be an array: for Pusher it fans out to multiple channels, and
 * for Firebase it is treated as a list of device registration tokens delivered
 * via a multicast send.
 */
export interface RealtimeDriver {
    broadcast (
        channel: string | string[],
        event: string,
        payload: RealtimeNotificationPayload,
    ): Promise<unknown>
}

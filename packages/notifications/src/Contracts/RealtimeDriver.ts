import type { RealtimeNotificationPayload } from '../types'

/**
 * A realtime transport (Pusher, Firebase, …) broadcasts a notification payload
 * to a channel/topic that connected clients subscribe to.
 */
export interface RealtimeDriver {
    broadcast (
        channel: string,
        event: string,
        payload: RealtimeNotificationPayload,
    ): Promise<unknown>
}

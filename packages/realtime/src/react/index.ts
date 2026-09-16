import { useCallback, useEffect, useState } from 'react'

import type { RealtimeClient } from '../RealtimeClient'
import type { RealtimeNotification } from '../types'
import { supersede } from '../supersede'

export interface UseNotificationsOptions {
    /** Cap the number of retained notifications (newest kept). Default: unbounded. */
    limit?: number
}

export interface UseNotificationsResult {
    notifications: RealtimeNotification[]
    latest: RealtimeNotification | null
    clear: () => void
}

/**
 * Subscribe a React component to a realtime channel, accumulating incoming
 * notifications (newest first) into state. Automatically unsubscribes on unmount
 * or when `client`/`channel` change.
 *
 * Tagged notifications supersede rather than accumulate: one replaces an earlier
 * notification with the same tag in place, and a retraction removes it. See
 * {@link supersede}.
 *
 * @param client   A {@link RealtimeClient} (from `createRealtime`).
 * @param channel  The channel to subscribe to, e.g. `client.channelFor(user.id)`.
 * @param options  `limit` caps how many notifications are retained.
 */
export function useNotifications (
    client: RealtimeClient,
    channel: string,
    options: UseNotificationsOptions = {},
): UseNotificationsResult {
    const [notifications, setNotifications] = useState<RealtimeNotification[]>([])
    const { limit } = options

    useEffect(() => {
        let unsubscribe: (() => void) | undefined
        let cancelled = false

        const push = (notification: RealtimeNotification) => setNotifications(
            (prev) => supersede(prev, notification, limit),
        )

        client.subscribe(channel, push)
            .then((off) => {
                // Unmounted before the (async) subscription resolved.
                if (cancelled) off()
                else unsubscribe = off
            })
            .catch(() => { /** surfaced by the caller's own error handling */ })

        return () => {
            cancelled = true
            unsubscribe?.()
        }
    }, [client, channel, limit])

    const clear = useCallback(() => setNotifications([]), [])

    return { notifications, latest: notifications[0] ?? null, clear }
}

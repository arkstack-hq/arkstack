import { computed, onScopeDispose, ref } from 'vue'

import type { ComputedRef, Ref } from 'vue'
import type { RealtimeClient } from '../RealtimeClient'
import type { RealtimeNotification } from '../types'

export interface UseNotificationsOptions {
    /** Cap the number of retained notifications (newest kept). Default: unbounded. */
    limit?: number
}

export interface UseNotificationsResult {
    notifications: Ref<RealtimeNotification[]>
    latest: ComputedRef<RealtimeNotification | null>
    clear: () => void
    stop: () => void
}

/**
 * Subscribe the current Vue scope to a realtime channel, accumulating incoming
 * notifications (newest first) into a ref. Automatically unsubscribes when the
 * scope is disposed (component unmount).
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
    const notifications = ref<RealtimeNotification[]>([])
    const { limit } = options

    let unsubscribe: (() => void) | undefined
    let cancelled = false

    const push = (notification: RealtimeNotification) => {
        const next = [notification, ...notifications.value]

        notifications.value = limit ? next.slice(0, limit) : next
    }

    client.subscribe(channel, push)
        .then((off) => {
            if (cancelled) off()
            else unsubscribe = off
        })
        .catch(() => { /** surfaced by the caller's own error handling */ })

    const stop = () => {
        cancelled = true
        unsubscribe?.()
        unsubscribe = undefined
    }

    onScopeDispose(stop)

    return {
        notifications,
        latest: computed(() => notifications.value[0] ?? null),
        clear: () => {
            notifications.value = []
        },
        stop,
    }
}

import type { RealtimeNotification } from './types'

/**
 * Fold an incoming notification into a list, honouring tag supersession.
 *
 * A notification carrying a `tag` names the thing it is about rather than the
 * moment it was sent, so a later notification with the same tag is understood as
 * a newer account of the same thing:
 *
 * - **Tagged, already present** — replaces the existing entry *in place*. The
 *   entry keeps its position so a list does not reshuffle under someone reading
 *   it; only its content changes.
 * - **Tagged, not present** — prepended, like any other notification.
 * - **Retracted** — removes the entry it names and contributes nothing itself. A
 *   retraction for something never seen is a no-op, which is the common case when
 *   a client connects after the fact.
 * - **Untagged** — prepended. Untagged notifications never supersede anything.
 *
 * Pure and list-in/list-out, so it suits any state container; the React and Vue
 * bindings are thin wrappers over it.
 *
 * @param list      The notifications held so far, newest first.
 * @param incoming  The notification just received.
 * @param limit     Caps the retained list (newest kept) when growing it.
 */
export const supersede = (
    list: RealtimeNotification[],
    incoming: RealtimeNotification,
    limit?: number,
): RealtimeNotification[] => {
    const { tag, retracted } = incoming

    if (retracted) {
        return tag ? list.filter((notification) => notification.tag !== tag) : list
    }

    if (tag) {
        const index = list.findIndex((notification) => notification.tag === tag)

        if (index !== -1) {
            const next = list.slice()
            next[index] = incoming

            return next
        }
    }

    const next = [incoming, ...list]

    return limit ? next.slice(0, limit) : next
}

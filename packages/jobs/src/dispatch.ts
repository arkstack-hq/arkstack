import type { DispatchOptions } from './types'
import { Job } from './Job'
import { PendingDispatch } from './PendingDispatch'

/**
 * Dispatch a job instance onto a queue.
 *
 * Returns a {@link PendingDispatch} that can be awaited directly, chained with
 * routing overrides, or passed `options` up front:
 *
 * ```ts
 * await dispatch(new SendReport(id))
 * await dispatch(new SendReport(id)).onQueue('reports')
 * await dispatch(new SendReport(id), { queue: 'reports', delay: 30 })
 * ```
 */
export const dispatch = <T extends Job> (job: T, options: DispatchOptions = {}): PendingDispatch<T> => {
    const pending = new PendingDispatch(job)

    if (options.connection) {
        pending.onConnection(options.connection)
    }

    if (options.queue) {
        pending.onQueue(options.queue)
    }

    if (options.delay !== undefined) {
        pending.withDelay(options.delay)
    }

    return pending
}

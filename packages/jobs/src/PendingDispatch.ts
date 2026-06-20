import type { Job } from './Job'
import { Queue } from '@arkstack/queue'

/**
 * A fluent, awaitable handle returned by `dispatch()` and `Job.dispatch()`.
 *
 * It collects routing overrides and, when awaited, pushes the job onto the
 * appropriate connection. Being thenable means `await dispatch(job)` works
 * directly, and the chained setters return `this` so they can precede the await:
 *
 * ```ts
 * await dispatch(new SendReport(id)).onQueue('reports').withDelay(30)
 * ```
 */
export class PendingDispatch<T extends Job = Job> implements PromiseLike<string> {
    constructor(private readonly job: T) { }

    /** Set the connection this job is dispatched to. */
    onConnection (connection: string): this {
        this.job.connection = connection

        return this
    }

    /** Set the queue this job is dispatched to. */
    onQueue (queue: string): this {
        this.job.queue = queue

        return this
    }

    /** Delay the dispatch by a number of seconds (or until a Date). */
    withDelay (delay: number | Date): this {
        this.job.delay = delay instanceof Date
            ? Math.max(0, Math.round((delay.getTime() - Date.now()) / 1000))
            : delay

        return this
    }

    /** The underlying job instance. */
    getJob (): T {
        return this.job
    }

    /**
     * Perform the dispatch, returning the resulting job id.
     */
    private send (): Promise<string> {
        if (this.job.delay && this.job.delay > 0) {
            return Queue.later(this.job.delay, this.job, this.job.queue)
        }

        return Queue.push(this.job, this.job.queue)
    }

    then<TResult1 = string, TResult2 = never> (
        onfulfilled?: ((value: string) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
        return this.send().then(onfulfilled, onrejected)
    }
}

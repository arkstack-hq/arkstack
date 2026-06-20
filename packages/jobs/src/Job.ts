import type { Queueable } from '@arkstack/queue'

import { JobRegistry } from './JobRegistry'
import { PendingDispatch } from './PendingDispatch'

/**
 * The base class for dispatchable jobs.
 *
 * Extend it and implement {@link handle}. Instances are {@link Queueable}, so
 * they can be pushed straight onto a queue, but the fluent dispatch API is the
 * idiomatic entry point:
 *
 * ```ts
 * class SendWelcomeEmail extends Job {
 *   constructor(public userId: number) { super() }
 *   async handle() { ...  }
 * }
 *
 * await SendWelcomeEmail.dispatch(1)                 // default connection/queue
 * await SendWelcomeEmail.dispatch(1).onQueue('mail') // fluent overrides
 * await SendWelcomeEmail.dispatch(1).withDelay(60)
 * ```
 */
export abstract class Job implements Queueable {
    /** The connection this job should be sent to. */
    connection?: string
    /** The queue this job should be sent to. */
    queue?: string
    /** Seconds to delay before the job becomes available. */
    delay?: number
    /** Maximum number of attempts before the job is marked failed. */
    tries?: number
    /** Seconds to wait before a released job becomes available again. */
    backoff?: number

    constructor() {
        // Self-register so a worker in this process can reconstruct the job.
        JobRegistry.register(this.constructor as never)
    }

    /**
     * Perform the work for this job. Implemented by subclasses.
     */
    abstract handle (): unknown | Promise<unknown>

    /**
     * Serialize the job's state for storage. Defaults to a shallow copy of the
     * instance's own properties. Override for custom serialization.
     */
    serialize (): Record<string, unknown> {
        return { ...this }
    }

    /** Send this job to the given connection. */
    onConnection (connection: string): this {
        this.connection = connection

        return this
    }

    /** Send this job to the given queue. */
    onQueue (queue: string): this {
        this.queue = queue

        return this
    }

    /** Delay the job by a number of seconds. */
    withDelay (seconds: number): this {
        this.delay = seconds

        return this
    }

    /**
     * Create a pending dispatch for this job class with the given constructor
     * arguments. Await it (or chain `onQueue`/`onConnection`/`withDelay`) to send.
     */
    static dispatch<T extends Job> (this: new (...args: any[]) => T, ...args: any[]): PendingDispatch<T> {
        return new PendingDispatch(new this(...args))
    }

    /**
     * Dispatch immediately on the synchronous connection, running the job inline.
     */
    static dispatchSync<T extends Job> (this: new (...args: any[]) => T, ...args: any[]): PendingDispatch<T> {
        return new PendingDispatch(new this(...args)).onConnection('sync')
    }
}

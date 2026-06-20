import type { JobPayload, Queueable } from '../types'

import { Job } from '../Job'

/**
 * The contract every queue connection (transport) driver implements.
 *
 * A connection is responsible only for moving job payloads to and from its
 * backing store. Executing jobs is the {@link import('../Worker').Worker}'s job,
 * and reconstructing job instances is handled by the serialization strategy.
 */
export abstract class QueueContract {
    protected connectionName = 'default'

    /** The name this connection was resolved under. */
    getConnectionName (): string {
        return this.connectionName
    }

    setConnectionName (name: string): this {
        this.connectionName = name

        return this
    }

    /**
     * Push a job onto the queue. Returns the job id.
     */
    abstract push (job: Queueable, queue?: string): Promise<string>

    /**
     * Push an already-serialized payload onto the queue. Returns the job id.
     */
    abstract pushRaw (payload: JobPayload, queue?: string, availableAt?: number): Promise<string>

    /**
     * Push a job to be processed after a delay (seconds or an absolute Date).
     */
    abstract later (delay: number | Date, job: Queueable, queue?: string): Promise<string>

    /**
     * Reserve and return the next available job, or `null` when none is ready.
     */
    abstract pop (queue?: string): Promise<Job | null>

    /**
     * The number of jobs waiting on the given queue.
     */
    abstract size (queue?: string): Promise<number>

    /**
     * Remove every job from the given queue. Returns the number removed.
     */
    abstract clear (queue?: string): Promise<number>
}

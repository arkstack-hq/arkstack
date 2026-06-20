import type { JobHandlers, JobPayload } from './types'

/**
 * A runtime handle to a job that has been popped (reserved) from a queue.
 *
 * The worker uses it to inspect attempt counts and to acknowledge completion
 * (`delete`) or schedule a retry (`release`). Drivers create instances and bind
 * the `delete`/`release` behaviour appropriate to their backing store.
 */
export class Job {
    private deleted = false
    private released = false
    private failed = false

    constructor(
        public readonly payload: JobPayload,
        public readonly queue: string,
        private readonly handlers: JobHandlers,
    ) { }

    /**
     * The unique job id.
     * 
     * @returns 
     */
    id (): string {
        return this.payload.id
    }

    /** 
     * The job's display name (used to resolve the job class). 
     */
    name (): string {
        return this.payload.displayName
    }

    /** 
     * How many times this job has been attempted (including the current run). 
     */
    attempts (): number {
        return this.payload.attempts
    }

    /** 
     * The maximum number of attempts, or `null` for unlimited. 
     */
    maxTries (): number | null {
        return this.payload.maxTries
    }

    /**
     * Seconds to wait before a released job becomes available again. 
     */
    backoff (): number {
        return this.payload.backoff
    }

    /**
     * Acknowledge the job as done and remove it from the queue. 
     */
    async delete (): Promise<void> {
        this.deleted = true

        await this.handlers.delete()
    }

    /**
     * Release the job back onto the queue, optionally after a delay. 
     */
    async release (delay = 0): Promise<void> {
        this.released = true

        await this.handlers.release(delay)
    }

    /**
     * Mark the job as having failed permanently. 
     */
    markAsFailed (): void {
        this.failed = true
    }

    isDeleted (): boolean {
        return this.deleted
    }

    isReleased (): boolean {
        return this.released
    }

    hasFailed (): boolean {
        return this.failed
    }
}

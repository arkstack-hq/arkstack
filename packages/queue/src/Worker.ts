import { Job } from './Job'
import { QueueContract } from './Contracts/QueueContract'
import { resolveJob } from './serialization'

export interface WorkerOptions {
    /** The queue name to pull from. */
    queue?: string
    /** Seconds to wait when the queue is empty before polling again. */
    sleep?: number
    /** Stop after processing this many jobs (0 = unlimited). */
    maxJobs?: number
    /** Stop the daemon as soon as the queue drains. */
    stopWhenEmpty?: boolean
}

/**
 * Observers for what a worker does with each job. A worker executes jobs the
 * caller can't see — a dedicated worker process reports what happened through
 * these, so a job that keeps failing isn't indistinguishable from an idle queue.
 */
export interface WorkerHandlers {
    /** A job has been reserved and is about to run. */
    onProcessing?: (job: Job) => void | Promise<void>
    /** A job completed and has been removed from the queue. */
    onProcessed?: (job: Job) => void | Promise<void>
    /**
     * A job threw. `released` is `true` when it goes back on the queue for
     * another attempt, `false` when it has exhausted its tries and failed.
     */
    onFailed?: (job: Job, error: unknown, released: boolean) => void | Promise<void>
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Pulls jobs from a connection and executes them.
 *
 * On success a job is deleted; on failure it is released for another attempt
 * until it exhausts `maxTries`, at which point it is marked failed (invoking the
 * job's `failed` hook) and removed.
 */
export class Worker {
    private shouldStop = false
    private readonly handlers: WorkerHandlers = {}

    constructor(private readonly connection: QueueContract) { }

    /** Signal a running {@link daemon} loop to stop after the current job. */
    stop (): void {
        this.shouldStop = true
    }

    /**
     * Observe what the worker does with each job. Handlers merge, so they can be
     * registered in more than one call.
     *
     * @param handlers  The callbacks to add.
     */
    on (handlers: WorkerHandlers): this {
        Object.assign(this.handlers, handlers)

        return this
    }

    /**
     * Pop and process the next job. Returns `true` if a job was processed,
     * `false` when the queue was empty.
     */
    async runNextJob (queue?: string): Promise<boolean> {
        const job = await this.connection.pop(queue)

        if (!job) {
            return false
        }

        await this.process(job)

        return true
    }

    /**
     * Execute a single reserved job, handling success and failure.
     */
    async process (job: Job): Promise<void> {
        try {
            await this.handlers.onProcessing?.(job)

            const instance = await resolveJob(job.payload)

            await instance.handle()
            await job.delete()
            await this.handlers.onProcessed?.(job)
        } catch (error) {
            await this.handleFailure(job, error)
        }
    }

    /**
     * Continuously process jobs until stopped (or until the queue drains, when
     * `stopWhenEmpty` is set).
     */
    async daemon (options: WorkerOptions = {}): Promise<void> {
        const sleep = (options.sleep ?? 3) * 1000
        let processed = 0

        this.shouldStop = false

        while (!this.shouldStop) {
            const handled = await this.runNextJob(options.queue)

            if (handled) {
                processed++

                if (options.maxJobs && processed >= options.maxJobs) {
                    break
                }

                continue
            }

            if (options.stopWhenEmpty) {
                break
            }

            await wait(sleep)
        }
    }

    private async handleFailure (job: Job, error: unknown): Promise<void> {
        const max = job.maxTries()

        if (max !== null && job.attempts() >= max) {
            job.markAsFailed()

            try {
                const instance = await resolveJob(job.payload)
                await instance.failed?.(error)
            } catch {
                // Swallow errors from the failure hook; the job is already failing.
            }

            await job.delete()
            await this.handlers.onFailed?.(job, error, false)

            return
        }

        await job.release(job.backoff())
        await this.handlers.onFailed?.(job, error, true)
    }
}

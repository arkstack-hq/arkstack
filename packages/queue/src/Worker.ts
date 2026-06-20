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

    constructor(private readonly connection: QueueContract) { }

    /** Signal a running {@link daemon} loop to stop after the current job. */
    stop (): void {
        this.shouldStop = true
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
            const instance = await resolveJob(job.payload)

            await instance.handle()
            await job.delete()
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

            return
        }

        await job.release(job.backoff())
    }
}

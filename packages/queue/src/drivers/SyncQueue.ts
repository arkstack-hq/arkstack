import type { JobPayload, Queueable } from '../types'

import { Job } from '../Job'
import { QueueContract } from '../Contracts/QueueContract'
import { resolveJob } from '../serialization'

/**
 * The synchronous connection runs jobs inline, the moment they are pushed.
 *
 * It needs no worker and no infrastructure, which makes it the natural default
 * for development and tests. Delays are ignored — the job runs immediately.
 */
export class SyncQueue extends QueueContract {
    async push (job: Queueable, _queue?: string): Promise<string> {
        await this.execute(job)

        return 'sync'
    }

    async pushRaw (payload: JobPayload, _queue?: string): Promise<string> {
        await this.execute(await resolveJob(payload))

        return payload.id
    }

    async later (_delay: number | Date, job: Queueable, _queue?: string): Promise<string> {
        return this.push(job)
    }

    async pop (): Promise<Job | null> {
        return null
    }

    async size (): Promise<number> {
        return 0
    }

    async clear (): Promise<number> {
        return 0
    }

    /**
     * Run a job, invoking its `failed` hook and rethrowing on error so the
     * caller (e.g. a dispatch) observes the failure synchronously.
     * 
     * @param job 
     */
    private async execute (job: Queueable): Promise<void> {
        try {
            await job.handle()
        } catch (error) {
            await job.failed?.(error)

            throw error
        }
    }
}

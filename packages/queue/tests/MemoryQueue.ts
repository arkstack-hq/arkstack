import { Job, type JobPayload, QueueContract, type Queueable, serializeJob } from '../src'

/**
 * A simple in-memory queue connection used to exercise the worker, reservation,
 * release and failure flows without needing Redis or a database.
 */
export class MemoryQueue extends QueueContract {
    private jobs: JobPayload[] = []
    private reserved = new Map<string, JobPayload>()

    async push (job: Queueable, _queue?: string): Promise<string> {
        return this.pushRaw(serializeJob(job))
    }

    async pushRaw (payload: JobPayload): Promise<string> {
        this.jobs.push(payload)

        return payload.id
    }

    async later (_delay: number | Date, job: Queueable): Promise<string> {
        return this.push(job)
    }

    async pop (queue?: string): Promise<Job | null> {
        const payload = this.jobs.shift()

        if (!payload) {
            return null
        }

        payload.attempts += 1
        this.reserved.set(payload.id, payload)

        return new Job(payload, queue ?? 'default', {
            delete: async () => {
                this.reserved.delete(payload.id)
            },
            release: async () => {
                this.reserved.delete(payload.id)
                this.jobs.push(payload)
            },
        })
    }

    async size (): Promise<number> {
        return this.jobs.length + this.reserved.size
    }

    async clear (): Promise<number> {
        const count = await this.size()
        this.jobs = []
        this.reserved.clear()

        return count
    }
}

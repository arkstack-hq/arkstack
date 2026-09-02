import { Job, JobRegistry, dispatch, loadJobs } from '../src'
import { type JobPayload, QueueContract, type Queueable, Worker, serializeJob } from '@arkstack/queue'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { dirname, resolve } from 'node:path'

import { Arkstack } from '@arkstack/contract'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Observable side effects shared across job instances. */
const effects: string[] = []

class SendWelcomeEmail extends Job {
    constructor(public userId: number, public template = 'default') {
        super()
    }

    async handle () {
        effects.push(`welcome:${this.userId}:${this.template}`)
    }
}

/** In-memory connection so we can exercise the full serialize → resolve path. */
class MemoryQueue extends QueueContract {
    private jobs: JobPayload[] = []

    async push (job: Queueable): Promise<string> {
        return this.pushRaw(serializeJob(job))
    }

    async pushRaw (payload: JobPayload): Promise<string> {
        this.jobs.push(payload)

        return payload.id
    }

    async later (_delay: number | Date, job: Queueable): Promise<string> {
        return this.push(job)
    }

    async pop (): Promise<import('@arkstack/queue').Job | null> {
        const payload = this.jobs.shift()

        if (!payload) {
            return null
        }

        payload.attempts += 1
        const { Job: QueuedJob } = await import('@arkstack/queue')

        return new QueuedJob(payload, 'default', {
            delete: async () => undefined,
            release: async () => {
                this.jobs.push(payload)
            },
        })
    }

    async size (): Promise<number> {
        return this.jobs.length
    }

    async clear (): Promise<number> {
        const count = this.jobs.length
        this.jobs = []

        return count
    }
}

describe('Jobs', () => {
    beforeAll(() => {
        dotenv.populate(process.env, { CONFIG_PATH: resolve(__dirname, './config') })
        Arkstack.setRootDir(resolve(__dirname, './'))
    })

    afterAll(() => {
        dotenv.populate(process.env, { CONFIG_PATH: undefined as never })
    })

    afterEach(() => {
        effects.length = 0
    })

    describe('Job base class', () => {
        it('registers itself on construction', () => {
            new SendWelcomeEmail(1)

            expect(JobRegistry.has('SendWelcomeEmail')).toBe(true)
        })

        it('serializes its own properties by default', () => {
            const job = new SendWelcomeEmail(7, 'vip')

            expect(job.serialize()).toMatchObject({ userId: 7, template: 'vip' })
        })

        it('supports fluent routing setters', () => {
            const job = new SendWelcomeEmail(1).onQueue('mail').onConnection('redis').withDelay(30)

            expect(job.queue).toBe('mail')
            expect(job.connection).toBe('redis')
            expect(job.delay).toBe(30)
        })
    })

    describe('Dispatching', () => {
        it('runs the job inline on the default sync connection', async () => {
            await SendWelcomeEmail.dispatch(42)

            expect(effects).toEqual(['welcome:42:default'])
        })

        it('dispatch() helper is awaitable', async () => {
            await dispatch(new SendWelcomeEmail(5, 'beta'))

            expect(effects).toEqual(['welcome:5:beta'])
        })

        it('dispatch() helper accepts options', async () => {
            const pending = dispatch(new SendWelcomeEmail(9), { queue: 'mail', delay: 15 })

            expect(pending.getJob().queue).toBe('mail')
            expect(pending.getJob().delay).toBe(15)
        })
    })

    describe('Registry reconstruction', () => {
        it('rebuilds a job from a payload without calling the constructor', () => {
            const original = new SendWelcomeEmail(11, 'reset')
            const payload: JobPayload = {
                id: 'x',
                displayName: 'SendWelcomeEmail',
                attempts: 0,
                maxTries: null,
                backoff: 0,
                data: original.serialize(),
            }

            const rebuilt = JobRegistry.resolve(payload) as SendWelcomeEmail

            expect(rebuilt).toBeInstanceOf(SendWelcomeEmail)
            expect(rebuilt.userId).toBe(11)
            expect(rebuilt.template).toBe('reset')
        })

        it('throws for an unknown job', () => {
            expect(() => JobRegistry.resolve({
                id: 'x', displayName: 'Ghost', attempts: 0, maxTries: null, backoff: 0, data: {},
            })).toThrow(/not registered/)
        })
    })

    describe('loadJobs', () => {
        it('registers the job classes a worker process would otherwise not know', async () => {
            // A dedicated worker constructs none of the app's jobs, so nothing
            // reaches the registry until their modules are loaded.
            JobRegistry.clear()

            expect(JobRegistry.has('LoadedJob')).toBe(false)

            const registered = await loadJobs()

            expect(registered).toContain('LoadedJob')
            expect(registered).toContain('AlsoLoadedJob')
            expect(JobRegistry.has('LoadedJob')).toBe(true)
            expect(JobRegistry.has('AlsoLoadedJob')).toBe(true)
        })

        it('skips abstract bases, non-job exports and modules that fail to load', async () => {
            const registered = await loadJobs()

            expect(registered).not.toContain('BaseFixtureJob')
            expect(registered).not.toContain('notAJob')
            // BrokenJob.ts throws on import; the rest still load.
            expect(registered).toContain('LoadedJob')
        })

        it('returns nothing when the directory does not exist', async () => {
            expect(await loadJobs('app/nowhere')).toEqual([])
        })
    })

    describe('End to end with a worker', () => {
        it('serializes, stores, resolves and runs the job', async () => {
            const queue = new MemoryQueue()

            await queue.push(new SendWelcomeEmail(100, 'queued'))
            expect(await queue.size()).toBe(1)

            const worker = new Worker(queue)
            await worker.runNextJob()

            expect(effects).toEqual(['welcome:100:queued'])
            expect(await queue.size()).toBe(0)
        })
    })
})

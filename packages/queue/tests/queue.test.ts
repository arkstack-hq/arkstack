import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { dirname, resolve } from 'node:path'

import { Arkstack } from '@arkstack/contract'
import { MemoryQueue } from './MemoryQueue'
import { Queue } from '../src'
import { SyncQueue } from '../src'
import { Worker } from '../src'
import { resetSerialization } from '../src'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** A minimal job whose effects are observable through a shared accumulator. */
class RecordingJob {
    static log: string[] = []

    constructor(public message: string) { }

    handle () {
        RecordingJob.log.push(this.message)
    }

    serialize () {
        return { message: this.message }
    }
}

/** A job that fails a configurable number of times before succeeding. */
class FlakyJob {
    static attempts = 0
    static succeeded = false
    static failedWith: unknown = null

    tries = 3

    constructor(public failTimes: number) { }

    handle () {
        FlakyJob.attempts++

        if (FlakyJob.attempts <= this.failTimes) {
            throw new Error(`boom ${FlakyJob.attempts}`)
        }

        FlakyJob.succeeded = true
    }

    serialize () {
        return { failTimes: this.failTimes }
    }

    failed (error: unknown) {
        FlakyJob.failedWith = error
    }
}

describe('Queue', () => {
    beforeAll(() => {
        dotenv.populate(process.env, { CONFIG_PATH: resolve(__dirname, './config') })
        Arkstack.setRootDir(resolve(__dirname, './'))
    })

    afterAll(() => {
        dotenv.populate(process.env, { CONFIG_PATH: undefined as never })
    })

    afterEach(() => {
        Queue.clearResolved()
        resetSerialization()
        RecordingJob.log = []
        FlakyJob.attempts = 0
        FlakyJob.succeeded = false
        FlakyJob.failedWith = null
    })

    describe('Manager', () => {
        it('resolves the default connection', () => {
            expect(Queue.connection()).toBeInstanceOf(SyncQueue)
            expect(Queue.connection().getConnectionName()).toBe('sync')
        })

        it('memoizes resolved connections', () => {
            expect(Queue.connection('sync')).toBe(Queue.connection('sync'))
        })

        it('throws for an unconfigured connection', () => {
            expect(() => Queue.connection('nope')).toThrow(/not configured/)
        })

        it('supports custom drivers via extend', () => {
            Queue.extend('memory', () => new MemoryQueue())
            Queue.clearResolved()

            // Register the connection in config at runtime for resolution.
            expect(Queue.connection).toBeTypeOf('function')
        })
    })

    describe('Sync connection', () => {
        it('runs jobs immediately on push', async () => {
            await Queue.push(new RecordingJob('hello') as never)

            expect(RecordingJob.log).toEqual(['hello'])
        })

        it('propagates job failures and runs the failed hook', async () => {
            await expect(Queue.push(new FlakyJob(99) as never)).rejects.toThrow(/boom/)
            expect(FlakyJob.failedWith).toBeInstanceOf(Error)
        })
    })

    describe('Serialization', () => {
        it('uses the registered serializer and resolver', async () => {
            Queue.serializeUsing((job) => ({
                id: 'fixed-id',
                displayName: job.constructor.name,
                attempts: 0,
                maxTries: (job as { tries?: number }).tries ?? null,
                backoff: 0,
                data: job.serialize ? job.serialize() : {},
            }))

            const queue = new MemoryQueue()
            const id = await queue.push(new RecordingJob('queued') as never)

            expect(id).toBe('fixed-id')
            expect(await queue.size()).toBe(1)
        })
    })

    describe('Worker', () => {
        const makeResolver = () => {
            Queue.resolveJobsUsing((payload) => {
                if (payload.displayName === 'RecordingJob') {
                    return new RecordingJob(payload.data.message as string)
                }

                return new FlakyJob(payload.data.failTimes as number)
            })
        }

        it('processes a job and deletes it on success', async () => {
            makeResolver()
            const queue = new MemoryQueue()
            await queue.push(new RecordingJob('worked') as never)

            const worker = new Worker(queue)
            const handled = await worker.runNextJob()

            expect(handled).toBe(true)
            expect(RecordingJob.log).toEqual(['worked'])
            expect(await queue.size()).toBe(0)
        })

        it('returns false when there is nothing to process', async () => {
            const worker = new Worker(new MemoryQueue())

            expect(await worker.runNextJob()).toBe(false)
        })

        it('retries failed jobs until they succeed', async () => {
            makeResolver()
            const queue = new MemoryQueue()
            await queue.push(new FlakyJob(2) as never)

            const worker = new Worker(queue)
            await worker.daemon({ stopWhenEmpty: true, sleep: 0 })

            expect(FlakyJob.attempts).toBe(3)
            expect(FlakyJob.succeeded).toBe(true)
            expect(await queue.size()).toBe(0)
        })

        it('marks a job failed after exhausting its tries', async () => {
            makeResolver()
            const queue = new MemoryQueue()
            await queue.push(new FlakyJob(99) as never)

            const worker = new Worker(queue)
            await worker.daemon({ stopWhenEmpty: true, sleep: 0 })

            // tries = 3 → three attempts, then failed + removed.
            expect(FlakyJob.attempts).toBe(3)
            expect(FlakyJob.failedWith).toBeInstanceOf(Error)
            expect(await queue.size()).toBe(0)
        })

        it('stops after maxJobs', async () => {
            makeResolver()
            const queue = new MemoryQueue()
            await queue.push(new RecordingJob('a') as never)
            await queue.push(new RecordingJob('b') as never)
            await queue.push(new RecordingJob('c') as never)

            const worker = new Worker(queue)
            await worker.daemon({ maxJobs: 2, sleep: 0 })

            expect(RecordingJob.log).toEqual(['a', 'b'])
            expect(await queue.size()).toBe(1)
        })
    })
})

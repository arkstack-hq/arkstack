import type { JobPayload, JobResolver, JobSerializer, Queueable } from './types'

import { randomUUID } from 'node:crypto'

/**
 * Pluggable (de)serialization for queued jobs.
 *
 * The transport drivers don't know how to reconstruct application job classes,
 * so the strategy is injected. `@arkstack/jobs` registers strategies backed by
 * its job registry; standalone usage can register its own, or rely on the
 * defaults (a shallow copy serializer and a resolver that must be overridden).
 *
 * Keeping this in its own module avoids a circular import between the queue
 * manager and the drivers that need to serialize.
 */
const defaultSerializer: JobSerializer = (job: Queueable): JobPayload => {
    const data = typeof job.serialize === 'function'
        ? job.serialize()
        : { ...job }

    return {
        id: randomUUID(),
        displayName: job.constructor?.name ?? 'Closure',
        attempts: 0,
        maxTries: job.tries ?? null,
        backoff: job.backoff ?? 0,
        data,
    }
}

const defaultResolver: JobResolver = () => {
    throw new Error(
        'No job resolver registered. Install/boot @arkstack/jobs, or call Queue.resolveJobsUsing().',
    )
}

let serializer: JobSerializer = defaultSerializer
let resolver: JobResolver = defaultResolver

export const setSerializer = (fn: JobSerializer): void => {
    serializer = fn
}

export const setResolver = (fn: JobResolver): void => {
    resolver = fn
}

export const serializeJob = (job: Queueable): JobPayload => serializer(job)

export const resolveJob = (payload: JobPayload): Queueable | Promise<Queueable> => resolver(payload)

/**
 * Reset the strategies to their defaults. Intended for tests.
 */
export const resetSerialization = (): void => {
    serializer = defaultSerializer
    resolver = defaultResolver
}

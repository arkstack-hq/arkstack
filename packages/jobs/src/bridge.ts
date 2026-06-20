import { Queue } from '@arkstack/queue'

import { Job } from './Job'
import { JobRegistry } from './JobRegistry'
import { randomUUID } from 'node:crypto'

let registered = false

/**
 * Wire `@arkstack/jobs` into `@arkstack/queue` by registering how jobs are
 * serialized to and resolved from payloads.
 *
 * Importing `@arkstack/jobs` (or `@arkstack/jobs/setup`) runs this once. It is
 * idempotent, so calling it again is a no-op.
 */
export const registerJobsWithQueue = (): void => {
    if (registered) {
        return
    }

    registered = true

    Queue.serializeUsing((job) => ({
        id: randomUUID(),
        displayName: (job instanceof Job ? JobRegistry.nameOf(job) : undefined)
            ?? job.constructor?.name
            ?? 'Closure',
        attempts: 0,
        maxTries: job.tries ?? null,
        backoff: job.backoff ?? 0,
        data: typeof job.serialize === 'function' ? job.serialize() : { ...job },
    }))

    Queue.resolveJobsUsing((payload) => JobRegistry.resolve(payload))
}

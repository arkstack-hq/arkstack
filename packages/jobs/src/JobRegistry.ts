import type { JobPayload } from '@arkstack/queue'
import type { Job } from './Job'
import type { JobConstructor } from './types'

// Back the registry with a global symbol so a job module evaluated more than
// once — the app's own import and a worker's jiti-loaded copy are different
// module instances — registers into the one map the worker resolves against.
const REGISTRY = Symbol.for('arkstack.jobs.registry')

const registry = (): Map<string, JobConstructor> => {
    const store = globalThis as unknown as Record<symbol, Map<string, JobConstructor>>

    return (store[REGISTRY] ??= new Map())
}

/**
 * A registry mapping job names to their classes so a worker can reconstruct job
 * instances from a stored payload.
 *
 * Job classes register themselves when instantiated, which covers same-process
 * dispatch + work. A dedicated worker process constructs none of them, so
 * `queue:work` calls {@link loadJobs} to import the application's job modules
 * before it starts working.
 */
export class JobRegistry {
    private static get classes(): Map<string, JobConstructor> {
        return registry()
    }

    /**
     * Register a job class under an explicit name (defaults to the class name).
     */
    static register (jobClass: JobConstructor, name?: string): typeof JobRegistry {
        this.classes.set(name ?? jobClass.name, jobClass)

        return this
    }

    /**
     * The registered name for a job instance, if any.
     */
    static nameOf (job: Job): string | undefined {
        const ctor = job.constructor as JobConstructor

        for (const [name, jobClass] of this.classes) {
            if (jobClass === ctor) {
                return name
            }
        }

        return undefined
    }

    /**
     * Whether a job name is registered.
     */
    static has (name: string): boolean {
        return this.classes.has(name)
    }

    /**
     * Reconstruct a job instance from a payload.
     *
     * The constructor is bypassed (via `Object.create`) and the serialized data
     * is assigned onto a fresh instance, so reconstruction never re-runs
     * constructor side effects.
     */
    static resolve (payload: JobPayload): Job {
        const jobClass = this.classes.get(payload.displayName)

        if (!jobClass) {
            throw new Error(
                `Job "${payload.displayName}" is not registered. Import the job class or call JobRegistry.register().`,
            )
        }

        const instance = Object.create(jobClass.prototype) as Job

        Object.assign(instance, payload.data)

        return instance
    }

    /**
     * Remove all registrations. Intended for tests.
     */
    static clear (): void {
        this.classes.clear()
    }
}

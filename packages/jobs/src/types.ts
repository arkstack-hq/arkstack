import type { Job } from './Job'

/**
 * Constructor type for a dispatchable {@link Job} subclass.
 */
export type JobConstructor<T extends Job = Job> = new (...args: any[]) => T

/**
 * Options that can be passed to a dispatch call to override routing/retry.
 */
export interface DispatchOptions {
    connection?: string
    queue?: string
    delay?: number | Date
}

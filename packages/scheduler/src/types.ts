/** A no-arg task the scheduler runs when an event is due. */
export type TaskCallback = () => void | Promise<void>

/** A predicate gating whether a due event actually runs. */
export type FilterCallback = () => boolean | Promise<boolean>

/** A lifecycle hook (before/after/onSuccess/onFailure). */
export type HookCallback = (error?: unknown) => void | Promise<void>

/** How an event's task is produced — used for `schedule:list` output. */
export type EventType = 'command' | 'call' | 'job' | 'exec'

/** The result of running one scheduled event. */
export interface RunResult {
    description: string
    expression: string
    ran: boolean
    /** Why it did not run, when `ran` is false. */
    skipped?: 'not-due' | 'filtered' | 'overlapping' | 'one-server' | 'environment'
    error?: unknown
}

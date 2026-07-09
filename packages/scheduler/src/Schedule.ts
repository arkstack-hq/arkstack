import { ScheduledEvent } from './ScheduledEvent'
import type { TaskCallback } from './types'

// Back the registry with a global symbol so the app's `routes/console.ts`
// (loaded via jiti) and the `schedule:*` commands share one list even if the
// module is evaluated more than once.
const REGISTRY = Symbol.for('arkstack.scheduler.events')

const registry = (): ScheduledEvent[] => {
    const store = globalThis as unknown as Record<symbol, ScheduledEvent[]>

    return (store[REGISTRY] ??= [])
}

/**
 * The scheduling facade. Define tasks in `src/routes/console.ts`:
 *
 * ```ts
 * import { Schedule } from '@arkstack/scheduler'
 *
 * Schedule.command('report:send').dailyAt('13:00')
 * Schedule.call(() => prune()).hourly().withoutOverlapping()
 * Schedule.job(new Heartbeat()).everyFiveMinutes()
 * Schedule.exec('backup.sh').daily().onOneServer()
 * ```
 */
export class Schedule {
    /** 
     * Run an Arkstack CLI command (`ark <name>`) on the schedule.  
     * 
     * @param name 
     * @param args 
     * @returns 
     */
    static command(name: string, args: string[] = []): ScheduledEvent {
        const event = new ScheduledEvent('command', `ark ${name}`).setProcess(name, args)

        return this.add(event)
    }

    /** 
     * Run a callback on the schedule. 
     * 
     * @param callback 
     * @returns 
     */
    static call(callback: TaskCallback): ScheduledEvent {
        const event = new ScheduledEvent('call', 'Closure').setCall(callback)

        return this.add(event)
    }

    /** 
     * Dispatch a queued job on the schedule (requires `@arkstack/jobs`). 
      * 
      * @param callback 
      * @returns 
      */
    static job(job: object): ScheduledEvent {
        const name = job?.constructor?.name ?? 'Job'
        const event = new ScheduledEvent('job', name).setJob(job)

        return this.add(event)
    }

    /** 
     * Run a shell command on the schedule. 
     * 
     * @param callback 
     * @returns 
     */
    static exec(command: string, args: string[] = []): ScheduledEvent {
        const event = new ScheduledEvent('exec', [command, ...args].join(' ')).setProcess(command, args)

        return this.add(event)
    }

    /** 
     * All registered events. 
     * 
     * @param callback 
     * @returns 
     */
    static events(): ScheduledEvent[] {
        return registry()
    }

    /** 
     * Events whose cron expression is due at `date`. 
     * 
     * @param callback 
     * @returns 
     */
    static dueEvents(date: Date = new Date()): ScheduledEvent[] {
        return registry().filter((event) => event.isDue(date))
    }

    /** 
     * Remove all registered events (used in tests). 
     * 
     * @param callback 
     * @returns 
     */
    static clear(): void {
        registry().length = 0
    }

    private static add(event: ScheduledEvent): ScheduledEvent {
        registry().push(event)

        return event
    }
}

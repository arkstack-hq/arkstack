import { Command } from '@h3ravel/musket'
import { Schedule } from '../Schedule'
import { loadSchedule } from '../loader'

/**
 * List the application's scheduled tasks with their cron expression and next
 * run time.
 */
export class ScheduleListCommand extends Command {
    protected signature = 'schedule:list'
    protected description = 'List the scheduled tasks.'

    async handle () {
        const loaded = await loadSchedule()
        const events = Schedule.events()

        if (!events.length) {
            this.warn(loaded
                ? 'No scheduled tasks are defined in src/routes/console.ts.'
                : 'No src/routes/console.ts found.')

            return
        }

        const now = new Date()

        for (const event of events) {
            const next = event.nextRunAt(now)
            const when = next ? `next: ${next.toISOString()}` : 'next: —'

            this.line(`  ${event.expression.padEnd(16)}  ${event.descriptionValue.padEnd(28)}  ${when}`)
        }

        this.info(`${events.length} scheduled task(s).`)
    }
}

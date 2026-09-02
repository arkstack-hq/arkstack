import { Command } from '@h3ravel/musket'
import { loadSchedule } from '../loader'
import { runDueEvents } from '../runner'

/**
 * Run the scheduler in the foreground, evaluating due tasks at the top of every
 * minute. Intended for local development so you don't need a system cron entry;
 * in production use a single `* * * * *` cron running `schedule:run`.
 */
export class ScheduleWorkCommand extends Command {
    protected signature = 'schedule:work'
    protected description = 'Run the scheduler every minute in the foreground (for local development).'

    async handle() {
        const loaded = await loadSchedule()

        if (!loaded) {
            this.warn('No src/routes/console.ts found — nothing to schedule.')

            return
        }

        this.info('Schedule worker started; evaluating tasks every minute. Press Ctrl+C to stop.')

        // Loop forever: sleep to just past the next minute boundary, then run
        // whatever is due in that minute.
        for (; ;) {
            await new Promise((resolve) => setTimeout(resolve, 60_000 - (Date.now() % 60_000) + 1_000))

            const results = await runDueEvents(new Date())

            for (const result of results) {
                if (result.ran) this.success(`Ran: ${result.description}`)
                else if (result.error) this.error(`Failed: ${result.description}`)
            }
        }
    }
}

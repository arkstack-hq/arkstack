import { Command } from '@h3ravel/musket'
import { loadSchedule } from '../loader'
import { runDueEvents } from '../runner'

/**
 * Run the scheduled tasks that are due right now. Invoke this once a minute from
 * cron:
 *
 * ```
 * * * * * * cd /path/to/app && npx ark schedule:run >> /dev/null 2>&1
 * ```
 */
export class ScheduleRunCommand extends Command {
    protected signature = 'schedule:run'
    protected description = 'Run the scheduled tasks that are due.'

    async handle () {
        const loaded = await loadSchedule()

        if (!loaded) {
            this.warn('No src/routes/console.ts found — nothing to schedule.')

            return
        }

        const results = await runDueEvents(new Date())

        if (!results.length) {
            this.info('No scheduled tasks are ready to run.')

            return
        }

        for (const result of results) {
            if (result.ran) {
                this.success(`Ran: ${result.description}`)
            } else if (result.error) {
                this.error(`Failed: ${result.description}`)
            } else {
                this.line(`Skipped (${result.skipped}): ${result.description}`)
            }
        }

        this.info(`${results.filter((r) => r.ran).length} task(s) ran.`)
    }
}

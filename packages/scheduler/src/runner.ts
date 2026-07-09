import type { RunResult } from './types'
import { Schedule } from './Schedule'

/**
 * Run every event that is due at `now` and whose filters pass, collecting a
 * result per event (including the ones skipped by filters or locks).
 *
 * @param now  The reference moment (defaults to now).
 */
export const runDueEvents = async (now: Date = new Date()): Promise<RunResult[]> => {
    const results: RunResult[] = []

    for (const event of Schedule.dueEvents(now)) {
        if (!(await event.filtersPass(now))) {
            results.push({
                description: event.descriptionValue,
                expression: event.expression,
                ran: false,
                skipped: 'filtered',
            })

            continue
        }

        results.push(await event.run(now))
    }

    return results
}

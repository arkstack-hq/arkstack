import { Cron } from 'croner'

/** Truncate a date to its minute (scheduler resolution is one minute). */
const toMinute = (date: Date): number => Math.floor(date.getTime() / 60_000)

/**
 * Whether a cron expression is due at the given moment (minute resolution).
 *
 * @param expression  A 5-field cron expression.
 * @param date        The moment to test (defaults to now).
 * @param timezone    IANA timezone the expression is evaluated in.
 */
export const isDue = (expression: string, date: Date = new Date(), timezone?: string): boolean => {
    try {
        const cron = new Cron(expression, timezone ? { timezone } : {})
        const next = cron.nextRun(new Date(toMinute(date) * 60_000 - 1_000))

        return !!next && toMinute(next) === toMinute(date)
    } catch {
        return false
    }
}

/**
 * The next time a cron expression will run after `from`.
 *
 * @param expression  A 5-field cron expression.
 * @param from        The reference moment (defaults to now).
 * @param timezone    IANA timezone the expression is evaluated in.
 */
export const nextRun = (expression: string, from: Date = new Date(), timezone?: string): Date | null => {
    try {
        return new Cron(expression, timezone ? { timezone } : {}).nextRun(from)
    } catch {
        return null
    }
}

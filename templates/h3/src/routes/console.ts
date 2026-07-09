import { Schedule } from '@arkstack/scheduler'

/*
 * Console schedule
 *
 * Define your scheduled tasks here. In production, run them with a single system
 * cron entry:
 *
 *   * * * * * cd /path/to/app && npx ark schedule:run >> /dev/null 2>&1
 *
 * During development, run `ark schedule:work` to evaluate tasks every minute.
 */

// Schedule.command('cache:prune').hourly()
Schedule.call(() => console.log('tick')).everyFiveMinutes().withoutOverlapping()
// Schedule.exec('backup.sh').dailyAt('01:30').onOneServer()

# Task Scheduling

`@arkstack/scheduler` lets you define scheduled tasks fluently in code instead of managing a crowd of cron entries on your server. You define the schedule once, and a single system cron entry drives everything.

## Install

Full app templates include the scheduler and a `src/routes/console.ts` file. To add it manually:

```sh
pnpm add @arkstack/scheduler
ark publish --package @arkstack/scheduler   # writes src/routes/console.ts
```

## Defining schedules

Define tasks in `src/routes/console.ts` using the `Schedule` facade:

```ts
import { Schedule } from '@arkstack/scheduler';

Schedule.command('cache:prune').hourly();

Schedule.call(async () => {
  await pruneTempFiles();
})
  .dailyAt('01:30')
  .withoutOverlapping();

Schedule.job(new SendDigest()).weeklyOn(1, '08:00');

Schedule.exec('backup.sh').daily().onOneServer();
```

### Task types

| Method                          | Runs                                           |
| ------------------------------- | ---------------------------------------------- |
| `Schedule.command(name, args?)` | An Arkstack CLI command (`ark <name>`)         |
| `Schedule.call(fn)`             | A callback                                     |
| `Schedule.job(job)`             | A queued job — dispatched via `@arkstack/jobs` |
| `Schedule.exec(cmd, args?)`     | A shell command                                |

## Running the scheduler

The scheduler evaluates due tasks once a minute. In production, add **one** cron entry that calls `schedule:run` every minute:

```sh
* * * * * cd /path/to/app && npx ark schedule:run >> /dev/null 2>&1
```

During development, run the foreground worker instead of a system cron:

```sh
ark schedule:work    # evaluates the schedule every minute until stopped
```

Inspect what's registered and when each task runs next:

```sh
ark schedule:list
```

## Frequencies

Frequency methods build the underlying cron expression:

```ts
Schedule.command('x').everyMinute();
Schedule.command('x').everyFiveMinutes(); // */5 * * * *
Schedule.command('x').everyThirtyMinutes();
Schedule.command('x').hourly();
Schedule.command('x').hourlyAt(15); // 15 past every hour
Schedule.command('x').daily(); // midnight
Schedule.command('x').dailyAt('13:00');
Schedule.command('x').twiceDaily(1, 13);
Schedule.command('x').weekly(); // Sunday midnight
Schedule.command('x').weeklyOn(1, '8:00'); // Monday 08:00
Schedule.command('x').monthly();
Schedule.command('x').monthlyOn(15, '17:00');
Schedule.command('x').quarterly();
Schedule.command('x').yearly();
Schedule.command('x').cron('*/10 9-17 * * 1-5'); // raw cron
```

Constrain the day of week, and layer time on top:

```ts
Schedule.command('x').weekdays().at('9:00');
Schedule.command('x').mondays();
Schedule.command('x').weekends().hourly();
Schedule.command('x').days([1, 4]); // Monday & Thursday
```

Set the timezone the expression is evaluated in:

```ts
Schedule.command('x').dailyAt('09:00').timezone('America/New_York');
```

## Constraints

Gate whether a due task actually runs:

```ts
Schedule.command('x')
  .daily()
  .when(async () => await featureEnabled('reports')) // run only when truthy
  .skip(() => isHoliday()) // skip when truthy
  .environments('production', 'staging') // limit by APP_ENV
  .between('09:00', '17:00'); // only within a daily window
```

Use `unlessBetween('22:00', '06:00')` to run _outside_ a window (overnight ranges are handled).

## Preventing overlaps & multi-server runs

```ts
Schedule.command('report:build').everyFiveMinutes().withoutOverlapping(); // skip if the previous run is still going

Schedule.exec('backup.sh').daily().onOneServer(); // run on only one server per due minute
```

Both use `@arkstack/cache` for their locks, so they coordinate across processes and servers. Install and configure a shared cache store (e.g. `redis` or `database`) for `onOneServer()` to be effective; without a cache the scheduler falls back to a process-local lock.

Long-running commands can be pushed to the background so they don't delay other due tasks:

```ts
Schedule.exec('long-import.sh').daily().runInBackground();
```

## Hooks

Run callbacks around a task:

```ts
Schedule.command('report:build')
  .daily()
  .before(() => logger.info('building report'))
  .onSuccess(() => notifyOk())
  .onFailure((error) => notifyFailed(error))
  .after(() => logger.info('done'));
```

## How it works

`schedule:run` loads `src/routes/console.ts`, finds the events whose cron expression is due in the current minute, checks their constraints, acquires any locks, and runs them — resolving cron with [croner](https://github.com/hexagon/croner). Because everything is evaluated per minute, a single `* * * * *` cron entry is all your server needs.

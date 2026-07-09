# @arkstack/scheduler

[![@arkstack/scheduler](https://img.shields.io/npm/dt/@arkstack/scheduler?style=flat-square&label=@arkstack/scheduler&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/scheduler)](https://www.npmjs.com/package/@arkstack/scheduler)

Task scheduling for [Arkstack](https://arkstack.toneflix.net). Define scheduled tasks fluently in code instead of managing a crowd of cron entries — a single system cron entry drives everything.

## Install

```sh
pnpm add @arkstack/scheduler
ark publish --package @arkstack/scheduler   # writes src/routes/console.ts
```

Full app templates include it and a `src/routes/console.ts` already.

## Define your schedule

In `src/routes/console.ts`:

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

| Task type                       | Runs                                           |
| ------------------------------- | ---------------------------------------------- |
| `Schedule.command(name, args?)` | An Arkstack CLI command (`ark <name>`)         |
| `Schedule.call(fn)`             | A callback                                     |
| `Schedule.job(job)`             | A queued job (dispatched via `@arkstack/jobs`) |
| `Schedule.exec(cmd, args?)`     | A shell command                                |

## Run it

The scheduler evaluates due tasks once a minute. In production, add **one** cron entry:

```
* * * * * cd /path/to/app && npx ark schedule:run >> /dev/null 2>&1
```

During development, run the foreground worker instead:

```sh
ark schedule:work    # evaluates the schedule every minute until stopped
ark schedule:list    # list tasks with their next run time
```

## Frequencies

```ts
Schedule.command('x').everyMinute();
Schedule.command('x').everyFiveMinutes(); // */5 * * * *
Schedule.command('x').everyThirtyMinutes();
Schedule.command('x').hourly();
Schedule.command('x').hourlyAt(15);
Schedule.command('x').daily();
Schedule.command('x').dailyAt('13:00');
Schedule.command('x').twiceDaily(1, 13);
Schedule.command('x').weekly();
Schedule.command('x').weeklyOn(1, '8:00'); // Monday 08:00
Schedule.command('x').monthly();
Schedule.command('x').monthlyOn(15, '17:00');
Schedule.command('x').quarterly();
Schedule.command('x').yearly();
Schedule.command('x').cron('*/10 9-17 * * 1-5'); // raw cron
```

Day-of-week constraints, with time layered on top:

```ts
Schedule.command('x').weekdays().at('9:00');
Schedule.command('x').weekends().hourly();
Schedule.command('x').mondays();
Schedule.command('x').days([1, 4]); // Monday & Thursday
```

Set the timezone the expression is evaluated in:

```ts
Schedule.command('x').dailyAt('09:00').timezone('America/New_York');
```

## Constraints

```ts
Schedule.command('x')
  .daily()
  .when(async () => await featureEnabled('reports')) // run only when truthy
  .skip(() => isHoliday()) // skip when truthy
  .environments('production', 'staging') // limit by APP_ENV
  .between('09:00', '17:00'); // only within a daily window
```

`unlessBetween('22:00', '06:00')` runs _outside_ a window (overnight ranges handled).

## Overlaps, single-server & background

```ts
Schedule.command('report:build').everyFiveMinutes().withoutOverlapping();
Schedule.exec('backup.sh').daily().onOneServer();
Schedule.exec('long-import.sh').daily().runInBackground();
```

`withoutOverlapping()` and `onOneServer()` coordinate through `@arkstack/cache`, so they work across processes and servers. Configure a shared cache store (`redis` or `database`) for `onOneServer()` to be effective; without a cache the scheduler falls back to a process-local lock.

## Hooks

```ts
Schedule.command('report:build')
  .daily()
  .before(() => logger.info('building report'))
  .onSuccess(() => notifyOk())
  .onFailure((error) => notifyFailed(error))
  .after(() => logger.info('done'));
```

## API

- `Schedule.command / call / job / exec` — register a task, returns a `ScheduledEvent` for chaining.
- `Schedule.events()` / `Schedule.dueEvents(date?)` — inspect registered / due events.
- `ScheduledEvent` — the fluent builder (frequencies, day constraints, `timezone`, `when`, `skip`, `environments`, `between`, `unlessBetween`, `withoutOverlapping`, `onOneServer`, `runInBackground`, `before`/`after`/`onSuccess`/`onFailure`, `description`, `name`).
- Commands: `schedule:run`, `schedule:work`, `schedule:list`.

Cron evaluation is powered by [croner](https://github.com/hexagon/croner). See the [scheduling guide](https://arkstack.toneflix.net/guide/scheduling) for the full walkthrough.

## License

MIT

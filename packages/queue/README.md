# @arkstack/queue

[![@arkstack/queue](https://img.shields.io/npm/dt/@arkstack/queue?style=flat-square&label=@arkstack/queue&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/queue)](https://www.npmjs.com/package/@arkstack/queue)

Queue module for Arkstack, providing a driver based queue transport and worker for background processing.

`@arkstack/queue` is the **transport** layer: connections, drivers, and the worker. Author your jobs with [`@arkstack/jobs`](../jobs), which provides the `Job` base class and a `dispatch()` helper on top of this package.

## Connections

| Driver     | Backing store                       | Notes                                   |
| ---------- | ----------------------------------- | --------------------------------------- |
| `sync`     | runs inline                         | default; no worker, great for dev/tests |
| `database` | a table via `@arkstack/database`    | a polling worker drains it              |
| `redis`    | Redis lists/sorted sets (`ioredis`) | distributed, supports delays            |

## Configuration

```ts
// src/config/queue.ts
import type { QueueConfig } from '@arkstack/queue';

export default (): QueueConfig => ({
  default: env('QUEUE_CONNECTION', 'sync'),
  connections: {
    sync: { driver: 'sync' },
    database: { driver: 'database', table: 'jobs', queue: 'default' },
    redis: {
      driver: 'redis',
      host: env('REDIS_HOST', '127.0.0.1'),
      port: env('REDIS_PORT', 6379),
    },
  },
});
```

## Usage

```ts
import { Queue } from '@arkstack/queue';

await Queue.push(new SendWelcomeEmail(user)); // onto the default connection
await Queue.later(60, new ChargeInvoice(invoiceId)); // after 60 seconds
await Queue.connection('redis').push(job, 'emails'); // a specific connection/queue
await Queue.size('emails');
await Queue.clear('emails');
```

## Workers

```bash
ark queue:work                      # daemon on the default connection
ark queue:work redis --queue=emails
ark queue:work --once               # process a single job and exit
ark queue:clear redis --queue=emails
```

Programmatically:

```ts
import { Queue } from '@arkstack/queue';

const worker = Queue.worker('database');
await worker.daemon({ queue: 'default', sleep: 3 });
```

A job is **deleted** on success, **released** for another attempt on failure, and **marked failed** (invoking its `failed` hook) once it exhausts `tries`.

## Job (de)serialization

Drivers other than `sync` store a serialized payload and need to reconstruct job
instances in the worker. `@arkstack/jobs` registers these strategies for you; to
do it manually:

```ts
import { Queue } from '@arkstack/queue';

Queue.serializeUsing((job) => ({
  /* JobPayload */
}));
Queue.resolveJobsUsing((payload) => rebuildJob(payload));
```

# Queue

Arkstack's queue is a driver-based transport and worker for running work in the background. It is the layer that moves jobs to and from a backing store and processes them; you author the jobs themselves with [Jobs](/guide/jobs).

> **Queue vs. Jobs.** `@arkstack/queue` is the transport (connections, drivers, worker). `@arkstack/jobs` is the authoring layer (the `Job` base class and `dispatch()`). Most application code interacts with Jobs; reach for the Queue API directly when you need fine-grained control.

## Install

Full app templates include the queue package and a `src/config/queue.ts` file. If you are adding it manually, install:

::: code-group

```sh [npm]
npm i @arkstack/queue
```

```sh [pnpm]
pnpm add @arkstack/queue
```

```sh [yarn]
yarn add @arkstack/queue
```

:::

The Redis connection relies on `ioredis`, and the database connection on `@arkstack/database`. Both are optional peer dependencies.

## Connections

| Driver     | Backing store                       | Notes                                   |
| ---------- | ----------------------------------- | --------------------------------------- |
| `sync`     | runs inline                         | default; no worker, great for dev/tests |
| `database` | a table via `@arkstack/database`    | a polling worker drains it              |
| `redis`    | Redis lists/sorted sets (`ioredis`) | distributed; supports delays            |

## Configuration

```ts
// src/config/queue.ts
import { QueueConfig } from '@arkstack/queue';
import { env } from '@arkstack/common';

export default (): QueueConfig => ({
  default: env('QUEUE_CONNECTION', 'sync'),
  connections: {
    sync: { driver: 'sync' },
    database: {
      driver: 'database',
      table: 'jobs',
      queue: 'default',
      retryAfter: 90,
    },
    redis: {
      driver: 'redis',
      host: env('REDIS_HOST', '127.0.0.1'),
      port: env('REDIS_PORT', 6379),
    },
  },
});
```

The `database` connection expects a `jobs` table with `id` (auto increment), `queue` (string), `payload` (text), `attempts` (int), `reserved_at` (nullable int), `available_at` (int), and `created_at` (int) columns.

## Dispatching

In most apps you dispatch through [Jobs](/guide/jobs). To push directly onto a connection, use the `Queue` facade:

```ts
import { Queue } from '@arkstack/queue';

await Queue.push(new SendWelcomeEmail(user)); // default connection
await Queue.later(60, new ChargeInvoice(invoiceId)); // available after 60 seconds
await Queue.connection('redis').push(job, 'emails'); // a specific connection + queue
await Queue.size('emails');
await Queue.clear('emails');
```

With the `sync` connection, pushed work runs immediately and inline.

## Workers

A worker pulls jobs from a connection and runs them. Run one from the CLI:

```sh
ark queue:work                      # daemon on the default connection
ark queue:work redis --queue=emails
ark queue:work --once               # process a single job and exit
ark queue:clear redis --queue=emails
```

Or drive a worker programmatically:

```ts
import { Queue } from '@arkstack/queue';

const worker = Queue.worker('database');
await worker.daemon({ queue: 'default', sleep: 3 });
```

### Retries & failures

A job is **deleted** on success. On failure it is **released** for another attempt until it exhausts its `tries`, at which point it is **marked failed** — invoking the job's `failed` hook — and removed. Released jobs become available again after the job's `backoff` (seconds).

## Job serialization

Connections other than `sync` store a serialized payload and must reconstruct job instances inside the worker. [Jobs](/guide/jobs) registers these strategies automatically. To wire them manually:

```ts
import { Queue } from '@arkstack/queue';

Queue.serializeUsing((job) => ({
  /* JobPayload */
}));
Queue.resolveJobsUsing((payload) => rebuildJob(payload));
```

## Custom connections

Register a custom transport with `Queue.extend`:

```ts
import { Queue, QueueContract } from '@arkstack/queue';

class SqsQueue extends QueueContract {
  /* implement push/pushRaw/later/pop/size/clear */
}

Queue.extend('sqs', (config, name) => new SqsQueue(/* ... */));
```

# Jobs

Jobs are self-contained units of work you can dispatch onto a [queue](/guide/queue) to run in the background. `@arkstack/jobs` is the authoring layer: it provides the `Job` base class, the `dispatch()` helper, and a registry that lets a worker reconstruct your job classes from a stored payload.

> Jobs build on [Queue](/guide/queue). The queue config (`src/config/queue.ts`) determines where dispatched jobs go and how they are processed — jobs themselves have no separate config file.

## Install

Full app templates include the jobs package. If you are adding it manually, install it alongside the queue:

::: code-group

```sh [npm]
npm i @arkstack/jobs @arkstack/queue
```

```sh [pnpm]
pnpm add @arkstack/jobs @arkstack/queue
```

```sh [yarn]
yarn add @arkstack/jobs @arkstack/queue
```

:::

Importing `@arkstack/jobs` anywhere wires the queue (de)serialization automatically. For an explicit bootstrap hook — alongside `@arkstack/database/setup` — import the setup entry:

```ts
import '@arkstack/jobs/setup';
```

## Writing a job

Generate one with the CLI:

```sh
ark make:job SendWelcomeEmail
```

This creates `src/app/jobs/SendWelcomeEmail.ts`. Extend `Job` and implement `handle()`:

```ts
// src/app/jobs/SendWelcomeEmail.ts
import { Job } from '@arkstack/jobs';

export class SendWelcomeEmail extends Job {
  constructor(public userId: number) {
    super();
  }

  async handle() {
    // ... send the email
  }
}
```

A job's constructor arguments become its serialized state, so keep them to plain, serializable values (ids, primitives, plain objects) rather than live instances.

## Dispatching

```ts
import { dispatch } from '@arkstack/jobs';
import { SendWelcomeEmail } from '@app/jobs/SendWelcomeEmail';

// static helper
await SendWelcomeEmail.dispatch(user.id);
await SendWelcomeEmail.dispatch(user.id).onQueue('mail').withDelay(60);
await SendWelcomeEmail.dispatchSync(user.id); // run inline now

// functional helper
await dispatch(new SendWelcomeEmail(user.id));
await dispatch(new SendWelcomeEmail(user.id), { queue: 'mail', delay: 60 });
```

The pending dispatch is awaitable and chainable:

| Method                       | Description                             |
| ---------------------------- | --------------------------------------- |
| `onConnection(name)`         | Send to a specific queue connection.    |
| `onQueue(name)`              | Send to a specific queue.               |
| `withDelay(seconds \| Date)` | Delay before the job becomes available. |

With the default `sync` connection the job runs immediately. Configure a `database` or `redis` connection (see [Queue](/guide/queue)) and run a worker to process jobs in the background:

```sh
ark queue:work
```

## Retries & failure handling

Control attempts and backoff with instance properties, and react to permanent failure with a `failed` hook:

```ts
import { Job } from '@arkstack/jobs';

export class ChargeInvoice extends Job {
  tries = 3; // max attempts before the job is marked failed
  backoff = 30; // seconds to wait before a released job retries

  constructor(public invoiceId: number) {
    super();
  }

  async handle() {
    // ...
  }

  async failed(error: unknown) {
    // called once attempts are exhausted
  }
}
```

## How reconstruction works

Each `Job` registers itself with the `JobRegistry` when constructed. When a worker pops a payload, the registry rebuilds the instance — bypassing the constructor — and assigns the serialized `data` back onto it. Override `serialize()` for custom payloads:

```ts
serialize() {
  return { userId: this.userId };
}
```

For dedicated worker **processes**, make sure your job modules are imported — or call `JobRegistry.register(MyJob)` — so the names are known before jobs are processed.

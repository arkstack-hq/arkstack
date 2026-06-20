# @arkstack/jobs

[![@arkstack/jobs](https://img.shields.io/npm/dt/@arkstack/jobs?style=flat-square&label=@arkstack/jobs&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/jobs)](https://www.npmjs.com/package/@arkstack/jobs)

Jobs module for Arkstack, providing dispatchable job classes and a dispatcher on top of [`@arkstack/queue`](../queue).

`@arkstack/jobs` is the **authoring** layer; `@arkstack/queue` is the transport. This package gives you the `Job` base class, the `dispatch()` helper, and a registry so workers can reconstruct your job classes from a stored payload.

## Writing a job

```bash
ark make:job SendWelcomeEmail
```

```ts
// src/app/jobs/SendWelcomeEmail.ts
import { Job } from '@arkstack/jobs'

export class SendWelcomeEmail extends Job {
  constructor(public userId: number) {
    super()
  }

  async handle () {
    // ... send the email
  }
}
```

## Dispatching

```ts
import { dispatch } from '@arkstack/jobs'
import { SendWelcomeEmail } from '@app/jobs/SendWelcomeEmail'

// static helper
await SendWelcomeEmail.dispatch(user.id)
await SendWelcomeEmail.dispatch(user.id).onQueue('mail').withDelay(60)
await SendWelcomeEmail.dispatchSync(user.id)   // run inline now

// functional helper
await dispatch(new SendWelcomeEmail(user.id))
await dispatch(new SendWelcomeEmail(user.id), { queue: 'mail', delay: 60 })
```

With the default `sync` queue connection the job runs immediately. Configure a
`database` or `redis` connection (see `@arkstack/queue`) and run a worker to
process jobs in the background:

```bash
ark queue:work
```

## Setup

Importing `@arkstack/jobs` anywhere wires the queue (de)serialization
automatically. For an explicit bootstrap hook (next to `@arkstack/database/setup`):

```ts
import '@arkstack/jobs/setup'
```

## How reconstruction works

Each `Job` registers itself with the `JobRegistry` when constructed. When a
worker pops a payload, the registry rebuilds the instance (bypassing the
constructor) and assigns the serialized `data` back onto it. For dedicated worker
**processes**, make sure your job modules are imported — or call
`JobRegistry.register(MyJob)` — so the names are known before processing.

Override `serialize()` on a job for custom payloads.

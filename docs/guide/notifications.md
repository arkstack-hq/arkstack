# Notifications

Arkstack notifications provide framework-neutral delivery for mail, SMS, and database-backed in-app notifications.

## Install

Full app templates include the notifications package and a `src/config/notifications.ts` file. If you are adding it manually, install:

::: code-group

```sh [npm]
npm i @arkstack/notifications
```

```sh [pnpm]
pnpm add @arkstack/notifications
```

```sh [yarn]
yarn add @arkstack/notifications
```

:::

## Configuration

Notification configuration is split into a default notification driver, driver-level options, and reusable transports.

```ts
// src/config/notifications.ts
import { env } from '@arkstack/common'

export default () => ({
  default_driver: env('NOTIFICATION_DRIVER', 'mail'),
  drivers: {
    mail: {
      transport: 'smtp',
      from: env('MAIL_FROM_ADDRESS', 'no-reply@example.com'),
      test_address: env('MAIL_TEST_ADDRESS'),
    },
    sms: {
      transport: env('SMS_TRANSPORT', 'africastalking'),
      from: env('SMS_FROM'),
    },
    db: {
      table: 'user_notifications',
    },
  },
  transports: {
    smtp: {
      host: env('MAIL_HOST', 'localhost'),
      port: env('MAIL_PORT', 1025),
      secure: env('MAIL_SECURE', false),
      auth: {
        user: env('SMTP_USER'),
        pass: env('SMTP_PASS'),
      },
    },
    africastalking: {
      username: env('AFRICASTALKING_USERNAME', 'sandbox'),
      apiKey: env('AFRICASTALKING_API_KEY'),
      senderId: env('AFRICASTALKING_SENDER_ID'),
    },
    twilio: {
      accountSid: env('TWILIO_ACCOUNT_SID'),
      authToken: env('TWILIO_AUTH_TOKEN'),
      from: env('TWILIO_FROM'),
    },
  },
})
```

`default_driver` selects the notification channel used by `Notification.channel()`. `drivers.sms.transport` selects the SMS transport provider, and starter config reads that value from `SMS_TRANSPORT`.

## Mail

Mail uses the configured SMTP transport. Recipients can be a string, an array of strings, a named address object, or an array of named address objects.

```ts
import { Notification } from '@arkstack/notifications'

await Notification.mail()
  .recipient({ 'ada@example.com': 'Ada Lovelace' })
  .subject('Welcome, {name}')
  .data({ name: 'Ada' })
  .send('Hello {name}, thanks for joining.')

await Notification.mail()
  .recipient([{ 'grace@example.com': 'Grace Hopper' }, { 'katherine@example.com': 'Katherine Johnson' }])
  .send('The report is ready.')
```

## SMS

SMS supports `africastalking` and `twilio` transports.

```ts
import { Notification } from '@arkstack/notifications'

await Notification.sms().recipient('+2348012345678').send('Your login code is {code}', undefined, undefined, {
  code: '123456',
})

await Notification.sms({ transport: 'twilio' })
  .recipient('+15551234567')
  .send('Your login code is {code}', undefined, undefined, {
    code: '123456',
  })
```

## Database Notifications

The `db` driver stores in-app notifications through the `UserNotification` model. Full templates include the model and migration for a `user_notifications` table.

```ts
await Notification.db()
  .recipient(user)
  .type('security')
  .action('Review login', '/account/security')
  .meta({ device: 'Chrome on macOS' })
  .send('A new login was detected.', 'Security alert')
```

You can also broacast the new database notifcation using the configured realtime driver by channing the `broadcast` method.

```ts
await Notification.db()
  .broadcast()
  .recipient(user)
  .type('security')
  .action('Review login', '/account/security')
  .meta({ device: 'Chrome on macOS' })
  .send('A new login was detected.', 'Security alert')
```

The notification is stored, broadcast on the user's channel, and pushed to their devices when [device push](#device-push) is configured.

Use `UserNotificationCenter` when you need to list, mark, or delete stored notifications:

```ts
import { UserNotificationCenter } from '@arkstack/notifications'

const unread = await UserNotificationCenter.unreadForUser(user)
await UserNotificationCenter.markRead(unread[0])
await UserNotificationCenter.delete(unread[0])
```

## Realtime Notifications

The `realtime` driver broadcasts a notification to connected clients. Each user has their own channel (`${channel_prefix}${user.id}`, e.g. `user.7`).

```ts
await Notification.realtime()
  .recipient(user)
  .type('transaction')
  .action('View', '/wallet')
  .store() // also persist so the client can load history
  .send('You received $20.00', 'Payment received')
```

`.store()` is opt-in: when enabled the notification is written via `UserNotificationCenter` (giving it a real id and timestamps) **and** broadcast; otherwise it is broadcast only. Broadcast on an explicit channel with `.channel('team.updates')`, or change the client event name with `.event('alert')`.

### Transports

`drivers.realtime.transport` picks how events reach clients:

| Transport           | Delivers to                           | Server SDK       | Client SDK  |
| ------------------- | ------------------------------------- | ---------------- | ----------- |
| `pusher`            | Pusher Channels, or soketi via `host` | `pusher`         | `pusher-js` |
| `firebase`          | FCM devices and topics                | `firebase-admin` | `firebase`  |
| `firebase-database` | Firebase Realtime Database channels   | `firebase-admin` | `firebase`  |
| `polling`           | Nothing; clients poll on an interval  | none             | none        |
| `memory`            | An in-process buffer, for tests       | none             | none        |

The SDKs are optional peer dependencies; install only the ones you use:

```sh
pnpm add pusher          # pusher
pnpm add firebase-admin  # firebase, firebase-database
```

To use a self-hosted Pusher-protocol server such as [soketi](https://soketi.app), set `host` and `port` (`PUSHER_HOST`, `PUSHER_PORT`) under `transports.pusher`. Clients receive the address through [the config route](#channel-authorization).

When browsers reach the server at a different address than your app does, for example `soketi:6001` inside Docker but `localhost:6001` from the browser, or a TLS proxy in front of it, set `public_host`, `public_port` and `public_use_tls` (`PUSHER_PUBLIC_HOST`, `PUSHER_PUBLIC_PORT`, `PUSHER_PUBLIC_USE_TLS`). They only change what clients are provissioned with; each defaults to its server-side counterpart.

`.channel()` (and `.recipient()`) also accept an **array**. For Pusher it fans out to multiple channels; for `firebase` it is treated as a list of **device registration tokens** and delivered via a chunked multicast (500 tokens per call). The multicast returns `{ successCount, failureCount, invalidTokens }`. Delete `invalidTokens` from your store, since FCM reports which are unregistered:

```ts
await Notification.realtime({ transport: 'firebase' })
  .channel(user.deviceTokens) // string[] of FCM registration tokens
  .send('You have a new message')
```

### Broadcasting events

A channel is just a channel. Use `Broadcast` to send your own event shapes over the configured transport, and pick them up with the client's `listen()`:

```ts
import { Broadcast } from '@arkstack/notifications'

await Broadcast.broadcast([`private-order.${order.id}`, `private-team.${order.teamId}`], 'order.updated', {
  id: order.id,
  status: order.status,
})
```

### Channel authorization

Register who may join each private channel. `{name}` placeholders match one segment (they never span a dot) and are passed to the callback. The first matching rule decides, unmatched channels are denied, and the per-user notification channel is allowed for its own user unless you register a rule for it.

```ts
// src/routes/realtime.ts
import { Broadcast } from '@arkstack/notifications'

Broadcast.channel('private-team.{teamId}', async (user, { teamId }) => {
  return await TeamMember.where({ teamId, userId: user.id }).exists()
})

await Broadcast.routes() // POST /realtime/auth, GET /realtime/config
```

`Broadcast.routes()` registers two routes behind the framework `auth` middleware (pass `{ prefix, middleware }` to change them):

- `POST /realtime/auth` authorizes the requested channel and answers in the active transport's terms: a Pusher signature, or a Firebase custom token for `firebase-database`.
- `GET /realtime/config` returns the public settings a client is created from. Secrets are never included.

When a channel is joined by something other than the logged-in user, such as a guest holding a scoped token, call `Broadcast.handleAuth(subject, { socket_id, channel_name }, { uid })` from your own route. Rules receive whatever `subject` you pass.

### Device push

Set `drivers.realtime.push` to `'firebase'` to also push every notification sent to a user to their registered devices over FCM, whatever the streaming transport is. When `push` is unset it is on only if the transport is `firebase`; set it to `false` to turn it off there. Tokens are read from `user.pushTokens` (a string, `string[]`, `{ token }` or `{ token }[]`), or from your own resolver:

```ts
realtime: {
  transport: 'pusher',
  push: 'firebase',
  push_tokens: async (user) =>
    (await UserPushToken.where({ userId: user.id, isActive: true }).get()).all(),
},
```

The send result carries the multicast outcome, so prune dead tokens there:

```ts
const result = await Notification.realtime().recipient(user).send('Your payout has settled.')

if (result.push?.invalidTokens.length) {
  await UserPushToken.whereIn('token', result.push.invalidTokens).delete()
}
```

Skip the push for one send with `.push(false)`, or target specific devices with `.devices(tokens)`.

### Registering a browser for push

`realtime.deviceToken()` asks for notification permission and returns this browser's FCM token, or `null` where web push is unavailable. It works whatever the streaming transport is, as long as the client config carries `firebase` (the config route includes it when `drivers.realtime.push` is `'firebase'`). Send the token to your API to store against the user:

```ts
const token = await realtime.deviceToken({ serviceWorker: '/push-sw.js' })

if (token) await api.post('/push-tokens', { token, platform: 'web' })
```

Background messages need a service worker. Pass its URL as `serviceWorker` and Arkstack registers it with the Firebase web config in its `firebaseConfig` query parameter, so the script needs no build step or secrets. Or pass a `ServiceWorkerRegistration` you registered yourself. Without the option, Firebase looks for `/firebase-messaging-sw.js`.

```js
// public/push-sw.js
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js')

firebase.initializeApp(JSON.parse(new URL(self.location).searchParams.get('firebaseConfig')))

firebase.messaging().onBackgroundMessage(({ data }) => {
  const notification = JSON.parse(data.payload)
  if (notification.retracted) return

  self.registration.showNotification(notification.title, {
    body: notification.description,
    tag: notification.tag ?? undefined,
    data: { link: notification.actionLink },
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.notification.data?.link) event.waitUntil(clients.openWindow(event.notification.data.link))
})
```

Pushes are data-only messages, so the service worker decides what to show. The payload is the same notification object clients receive live.

### Delivery options

FCM sends a data message at normal priority, and Android's Doze and App Standby may hold it until the next maintenance window. `.priority('high')` exempts it, and pairs naturally with a short TTL — FCM's own default is four weeks:

```ts
await Notification.realtime({ transport: 'firebase' })
  .channel(user.deviceTokens)
  .priority('high')
  .ttl(60)
  .collapseKey(`signin:${attemptId}`) // a retry replaces the prompt it repeats
  .send('Approve sign-in from Lagos?')
```

Pass TTL in seconds; each platform's unit is converted for you. Set defaults under `drivers.realtime.delivery`, override per send, and reach anything unmapped through `.delivery({ android, apns, webpush })`. Pusher ignores all of it — it pushes over a connection the client already holds open.

On iOS this maps to APNs only for a visible push (`apns-push-type: alert`), since Apple requires background pushes to be low priority. Ringing or full-screen alerts need PushKit, which FCM cannot address at all.

### Superseding a notification

`.tag()` gives a notification a stable identity, so a later one with the same tag replaces it on the client instead of stacking beside it:

```ts
// asked
await Notification.realtime({ transport: 'firebase' })
  .channel(tokens)
  .tag(`signin:${attemptId}`)
  .collapseKey(`signin:${attemptId}`)
  .priority('high')
  .ttl(60)
  .send('Approve sign-in from Lagos?')

// answered elsewhere
await Notification.realtime({ transport: 'firebase' })
  .channel(tokens)
  .tag(`signin:${attemptId}`)
  .collapseKey(`signin:${attemptId}`)
  .send('Sign-in approved')
```

Tag by the thing it is about (`order:42`), not the message. `tag` supersedes what was **displayed**; `collapseKey` supersedes what is still **queued** — set both when you want both. They stay separate because FCM allows only four collapse keys per device, so deriving one per tag would starve that budget.

`.retract()` removes a notification with nothing in its place. Prefer a replacement where the outcome has content of its own: a retraction must travel as a silent push, which platforms throttle hardest. Retractions are never stored, and retracting does not touch a row already written by `.store()`.

The React and Vue bindings apply this for you; for your own list, use the same reducer:

```ts
import { supersede } from '@arkstack/realtime'

client.subscribe(channel, (n) => setItems((items) => supersede(items, n, 50)))
```

Configure the transport in `src/config/notifications.ts` (`drivers.realtime`) and its credentials under `transports.*`.

**Bringing your own transport.** `driverFactory` replaces the built-ins with anything implementing `RealtimeDriver` — a backend this package does not ship, or a fake in a test. Set it per send, or under `drivers.realtime` for the whole app; it takes precedence over `transport`. Do connection setup lazily inside the driver, as the bundled ones do.

```ts
Notification.realtime({ driverFactory: () => new MyApnsDriver() })
```

`broadcast()` also accepts payloads that are not notifications, so an application can push its own event shapes over the same channel and pick them up with the client's `listen()`.

### Firebase Realtime Database

The `firebase-database` transport writes each event to `{root}/{channel}/{key}` (default root `arkstack/channels`). When a client is authorized for a channel, the server writes a grant to `arkstack/grants/{uid}/{channel}` that expires after `grant_ttl` seconds (default 3600) and returns a custom token to sign in with. Deploy security rules that check the grant, and index `at`:

```json
{
  "rules": {
    "arkstack": {
      "channels": {
        "$channel": {
          ".read": "auth != null && root.child('arkstack/grants/' + auth.uid + '/' + $channel).val() > now",
          ".indexOn": ["at"]
        }
      }
    }
  }
}
```

Everything else stays unreadable, so the grants and the event index are never exposed. Channel names are stored URL-encoded with `.` written as `%2E`, so rules see the same key the server wrote. The `uid` must be usable as a database key; it defaults to the subscriber's `id`.

Events are not deleted automatically. Schedule a prune; each call removes at most `limit` events:

```ts
import { Broadcast, FirebaseDatabaseRealtimeDriver } from '@arkstack/notifications'

const driver = Broadcast.make('firebase-database') as FirebaseDatabaseRealtimeDriver

while ((await driver.prune(24 * 3600, 500)) > 0);
```

### Testing

Set the transport to `memory` and read what was sent. The buffer lives on `globalThis`, so broadcasts made by code loaded separately from your tests are recorded too:

```ts
import { MemoryRealtimeDriver } from '@arkstack/notifications'

beforeEach(() => MemoryRealtimeDriver.clear())

expect(MemoryRealtimeDriver.broadcasts()).toContainEqual(
  expect.objectContaining({ channel: 'user.7', event: 'notification' }),
)
```

**Firebase credentials** can be provided two ways. Point `admin_sdk_path` (`FIREBASE_ADMINSDK`, default `firebase-adminsdk.json`, resolved from the project root) at a downloaded service-account JSON file; if that file is absent, the driver falls back to the inline `project_id` / `client_email` / `private_key` values (`FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`). `app_name` (`FIREBASE_APP_NAME`, default your `APP_NAME`) names the Firebase Admin app instance so repeated broadcasts reuse it.

### Consuming on the client

Install `@arkstack/realtime` in your front-end and the matching client SDK (`pusher-js` or `firebase`). The simplest setup creates the client from the server's config route and adds your API's auth header:

```ts
import { createRealtime } from '@arkstack/realtime'

const headers = { Authorization: `Bearer ${token}` }
const config = await fetch('/api/realtime/config', { headers }).then((r) => r.json())

const realtime = createRealtime({
  ...config,
  pusher: config.pusher && {
    ...config.pusher,
    apiBase: '/api',
    auth: { headers },
  },
  'firebase-database': config['firebase-database'] && {
    ...config['firebase-database'],
    apiBase: '/api',
    auth: { headers },
  },
})

const unsubscribe = await realtime.forUser(user.id, (notification) => {
  console.log(notification.title, notification.description)
})

// Your own events
await realtime.listen(`private-order.${order.id}`, 'order.updated', refresh)
```

Under `polling` nothing arrives on a channel. `onPoll()` runs a handler on the advertised interval only while polling, so one code path serves every transport:

```ts
await realtime.listen(channel, 'order.updated', refresh)
await realtime.onPoll(refresh)
```

For tests, use `transport: 'memory'` and feed subscribers with `emitMemoryEvent(channel, event, payload)`.

The transport SDKs are loaded with a dynamic `import()` of their package name (`pusher-js`, `firebase/app`, …), which a bundler resolves. On a page without a bundler, such as a plain `<script>` embed, pass `importModule` to load them another way, for example from a CDN:

```ts
const realtime = createRealtime({
  ...config,
  importModule: (specifier) => import(/* @vite-ignore */ `https://cdn.jsdelivr.net/npm/${cdnPaths[specifier]}`),
})

const cdnPaths: Record<string, string> = {
  'pusher-js': 'pusher-js@8/+esm',
  'firebase/app': 'firebase@11/app/+esm',
  'firebase/auth': 'firebase@11/auth/+esm',
  'firebase/database': 'firebase@11/database/+esm',
  'firebase/messaging': 'firebase@11/messaging/+esm',
}
```

React and Vue bindings accumulate notifications for you (newest first):

::: code-group

```tsx [React]
import { useNotifications } from '@arkstack/realtime/react'

function Bell({ realtime, userId }) {
  const { notifications, latest, clear } = useNotifications(realtime, realtime.channelFor(userId), { limit: 20 })

  return (
    <span>
      {notifications.length} · {latest?.title}
    </span>
  )
}
```

```vue [Vue]
<script setup>
import { useNotifications } from "@arkstack/realtime/vue";

const props = defineProps(["realtime", "userId"]);
const { notifications, latest } = useNotifications(
  props.realtime,
  props.realtime.channelFor(props.userId),
  { limit: 20 },
);
</script>

<template>
  <span>{{ notifications.length }} · {{ latest?.title }}</span>
</template>
```

:::

## Prepared Recipients

`Notification.prepare()` can derive the recipient from a user-like object:

```ts
await Notification.channel('mail').prepare(user, { name: user.name }).send('Hello {name}')

await Notification.channel('sms').prepare(user).send('Your verification code is {code}', undefined, undefined, {
  code,
})

await Notification.channel('db').prepare(user).send('Your payout has settled.', 'Payout settled')
```

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
import { env } from '@arkstack/common';

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
});
```

`default_driver` selects the notification channel used by `Notification.channel()`. `drivers.sms.transport` selects the SMS transport provider, and starter config reads that value from `SMS_TRANSPORT`.

## Mail

Mail uses the configured SMTP transport. Recipients can be a string, an array of strings, a named address object, or an array of named address objects.

```ts
import { Notification } from '@arkstack/notifications';

await Notification.mail()
  .recipient({ 'ada@example.com': 'Ada Lovelace' })
  .subject('Welcome, {name}')
  .data({ name: 'Ada' })
  .send('Hello {name}, thanks for joining.');

await Notification.mail()
  .recipient([
    { 'grace@example.com': 'Grace Hopper' },
    { 'katherine@example.com': 'Katherine Johnson' },
  ])
  .send('The report is ready.');
```

## SMS

SMS supports `africastalking` and `twilio` transports.

```ts
import { Notification } from '@arkstack/notifications';

await Notification.sms()
  .recipient('+2348012345678')
  .send('Your login code is {code}', undefined, undefined, {
    code: '123456',
  });

await Notification.sms({ transport: 'twilio' })
  .recipient('+15551234567')
  .send('Your login code is {code}', undefined, undefined, {
    code: '123456',
  });
```

## Database Notifications

The `db` driver stores in-app notifications through the `UserNotification` model. Full templates include the model and migration for a `user_notifications` table.

```ts
await Notification.db()
  .recipient(user)
  .type('security')
  .action('Review login', '/account/security')
  .meta({ device: 'Chrome on macOS' })
  .send('A new login was detected.', 'Security alert');
```

Use `UserNotificationCenter` when you need to list, mark, or delete stored notifications:

```ts
import { UserNotificationCenter } from '@arkstack/notifications';

const unread = await UserNotificationCenter.unreadForUser(user);
await UserNotificationCenter.markRead(unread[0]);
await UserNotificationCenter.delete(unread[0]);
```

## Realtime Notifications

The `realtime` driver broadcasts a notification to connected clients over [Pusher Channels](https://pusher.com/channels) or [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging). Each user has their own channel (`${channel_prefix}${user.id}`, e.g. `user.7`).

```ts
await Notification.realtime()
  .recipient(user)
  .type('transaction')
  .action('View', '/wallet')
  .store() // also persist so the client can load history
  .send('You received $20.00', 'Payment received');
```

`.store()` is opt-in: when enabled the notification is written via `UserNotificationCenter` (giving it a real id and timestamps) **and** broadcast; otherwise it is broadcast only. Broadcast on an explicit channel with `.channel('team.updates')`, or change the client event name with `.event('alert')`.

`.channel()` (and `.recipient()`) also accept an **array**. For Pusher it fans out to multiple channels; for Firebase it is treated as a list of **device registration tokens** and delivered via a chunked multicast (500 tokens per call). The Firebase multicast returns `{ successCount, failureCount, invalidTokens }` — delete `invalidTokens` from your store, since FCM reports which are unregistered:

```ts
await Notification.realtime({ transport: 'firebase' })
  .channel(user.deviceTokens) // string[] of FCM registration tokens
  .send('You have a new message');
```

Configure the transport in `src/config/notifications.ts` (`drivers.realtime`) and its credentials under `transports.pusher` / `transports.firebase`. The `pusher` / `firebase-admin` SDKs are optional, install only the one you use:

```sh
pnpm add pusher          # Pusher transport
pnpm add firebase-admin  # Firebase transport
```

**Firebase credentials** can be provided two ways. Point `admin_sdk_path` (`FIREBASE_ADMINSDK`, default `firebase-adminsdk.json`, resolved from the project root) at a downloaded service-account JSON file; if that file is absent, the driver falls back to the inline `project_id` / `client_email` / `private_key` values (`FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`). `app_name` (`FIREBASE_APP_NAME`, default your `APP_NAME`) names the Firebase Admin app instance so repeated broadcasts reuse it.

### Consuming on the client

Install `@arkstack/realtime` in your front-end and the matching client SDK (`pusher-js` or `firebase`):

```ts
import { createRealtime } from '@arkstack/realtime';

const realtime = createRealtime({
  transport: 'pusher',
  pusher: {
    key: import.meta.env.VITE_PUSHER_KEY,
    cluster: 'mt1',
    authEndpoint: '/broadcasting/auth',
  },
});

const unsubscribe = await realtime.forUser(user.id, (notification) => {
  console.log(notification.title, notification.description);
});
```

React and Vue bindings accumulate notifications for you (newest first):

::: code-group

```tsx [React]
import { useNotifications } from '@arkstack/realtime/react';

function Bell({ realtime, userId }) {
  const { notifications, latest, clear } = useNotifications(
    realtime,
    realtime.channelFor(userId),
    { limit: 20 },
  );

  return (
    <span>
      {notifications.length} · {latest?.title}
    </span>
  );
}
```

```vue [Vue]
<script setup>
import { useNotifications } from '@arkstack/realtime/vue';

const props = defineProps(['realtime', 'userId']);
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
await Notification.channel('mail')
  .prepare(user, { name: user.name })
  .send('Hello {name}');

await Notification.channel('sms')
  .prepare(user)
  .send('Your verification code is {code}', undefined, undefined, {
    code,
  });

await Notification.channel('db')
  .prepare(user)
  .send('Your payout has settled.', 'Payout settled');
```

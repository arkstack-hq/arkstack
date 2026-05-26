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

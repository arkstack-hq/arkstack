# @arkstack/notifications

Framework-neutral notifications for Arkstack applications.

```ts
import { Notification } from '@arkstack/notifications';

await Notification.mail()
  .recipient({ 'ada@example.com': 'Ada Lovelace' })
  .subject('Welcome, {name}')
  .data({ name: 'Ada' })
  .send('Hello {name}, thanks for joining.');

await Notification.sms()
  .recipient('+2348012345678')
  .send('Your code is {code}', undefined, undefined, { code: '123456' });

await Notification.db()
  .recipient(user)
  .send('Your payout has settled', 'Payout settled');
```

Apps using database notifications should provide a `UserNotification` model backed by a `user_notifications` table. The starter templates include this model and migration.

## Config

```ts
export default () => ({
  default_driver: 'mail',
  drivers: {
    mail: {
      transport: 'smtp',
      from: env('SMTP_FROM_ADDRESS', 'no-reply@example.com'),
    },
    sms: {
      transport: 'africastalking',
    },
    db: {
      table: 'user_notifications',
    },
  },
  transports: {
    smtp: {
      host: env('SMTP_HOST', 'localhost'),
      port: env('SMTP_PORT', 1025),
    },
    africastalking: {
      username: env('AFRICASTALKING_USERNAME', 'sandbox'),
      apiKey: env('AFRICASTALKING_API_KEY', 'sandbox'),
    },
    twilio: {
      accountSid: env('TWILIO_ACCOUNT_SID'),
      authToken: env('TWILIO_AUTH_TOKEN'),
      from: env('TWILIO_FROM'),
    },
  },
});
```

import { Arkstack } from '@arkstack/contract'
import { NotificationConfig } from '@arkstack/notifications'
import { join } from 'node:path'

export default (): NotificationConfig => {
  return {
    /**
     * Default Notification Driver
     *
     * The default notifications driver that is utilized for outgoing messages.
     */
    default_driver: env('NOTIFICATION_DRIVER', 'mail'),

    /**
     * Notification Drivers
     *
     * Notifications will be sent using one of the configured drivers.
     */
    drivers: {
      mail: {
        transport: env('MAIL_TRANSPORT', 'smtp') as 'smtp' | 'file',
        from: {
          name: env('MAIL_FROM_NAME', 'Arcstack'),
          address: env('MAIL_FROM_ADDRESS', 'no-reply@example.com'),
        },
        test_address: env('MAIL_TEST_ADDRESS'),
      },
      sms: {
        transport: 'africastalking',
        from: env('SMS_FROM', env('AFRICASTALKING_SENDER_ID', env('TWILIO_FROM'))),
      },
      db: {
        table: 'user_notifications',
      },
      realtime: {
        /**
         * pusher | firebase | firebase-database | polling | memory
         */
        transport: env('REALTIME_TRANSPORT', 'pusher'),
        /**
         * Also push user notifications to their devices: 'firebase' or false.
         */
        push: env('REALTIME_PUSH', false),
        channel_prefix: env('REALTIME_CHANNEL_PREFIX', 'user.'),
        event: env('REALTIME_EVENT', 'notification'),
        store: env('REALTIME_STORE', false),
      },
    },
    transports: {
      /**
       * SMTP Notifications Transport
       *
       * Outgoing notifications will be sent as mail using SMTP.
       */
      smtp: {
        host: env('MAIL_HOST', 'localhost'),
        port: env('MAIL_PORT', 1025),
        secure: env('MAIL_SECURE', false),
        auth: {
          user: env('MAIL_USERNAME', 'user@example.com'),
          pass: env('MAIL_PASSWORD', 'password'),
        },
      },

      /**
       * File Notifications Transport
       *
       * Outgoing notifications will be sent as mail but stored locally in a file
       * for testing purposes.
       */
      file: {
        /**
         * Mails Directory
         *
         * Outgoing mails will be intercepted and stored in this directory.
         */
        directory: env('MAIL_FILE_PATH', join(Arkstack.rootDir(), './storage/framework/mails')),
      },

      /**
       * Africa's Talking Notifications Transport
       *
       * Outgoing notifications will be sent as SMS via Africa's Talking.
       */
      africastalking: {
        username: env('AFRICASTALKING_USERNAME', 'sandbox'),
        apiKey: env('AFRICASTALKING_API_KEY', 'sandbox'),
        senderId: env('AFRICASTALKING_SENDER_ID', env('SMS_FROM', 'Arkstack')),
      },

      /**
       * Twilio Notifications Transport
       *
       * Outgoing notifications will be sent as SMS via Twilio.
       */
      twilio: {
        accountSid: env('TWILIO_ACCOUNT_SID'),
        authToken: env('TWILIO_AUTH_TOKEN'),
        from: env('TWILIO_FROM', env('SMS_FROM')),
      },

      /**
       * Pusher Realtime Transport
       *
       * Realtime notifications will be broadcast over Pusher Channels.
       */
      pusher: {
        app_id: env('PUSHER_APP_ID', ''),
        key: env('PUSHER_KEY', ''),
        secret: env('PUSHER_SECRET', ''),
        cluster: env('PUSHER_CLUSTER', 'mt1'),
        use_tls: env('PUSHER_USE_TLS', true),
      },

      /**
       * Firebase Realtime Transport
       *
       * Realtime notifications will be broadcast over Firebase Cloud Messaging topics.
       */
      firebase: {
        project_id: env('FIREBASE_PROJECT_ID', ''),
        client_email: env('FIREBASE_CLIENT_EMAIL', ''),
        private_key: env('FIREBASE_PRIVATE_KEY', ''),
        app_name: env('APP_NAME', 'Arkstack'),
        admin_sdk_path: env('FIREBASE_ADMINSDK', 'firebase-adminsdk.json'),
        web: {
          api_key: env('FIREBASE_API_KEY', ''),
          app_id: env('FIREBASE_APP_ID', ''),
          messaging_sender_id: env('FIREBASE_MESSAGING_SENDER_ID', ''),
          vapid_key: env('FIREBASE_VAPID_KEY', ''),
        },
      },

      /**
       * Firebase Realtime Database Transport
       *
       * Realtime notifications will be broadcast over Realtime Database channels.
       */
      'firebase-database': {
        project_id: env('FIREBASE_PROJECT_ID', ''),
        client_email: env('FIREBASE_CLIENT_EMAIL', ''),
        private_key: env('FIREBASE_PRIVATE_KEY', ''),
        app_name: env('APP_NAME', 'Arkstack'),
        admin_sdk_path: env('FIREBASE_ADMINSDK', 'firebase-adminsdk.json'),
        database_url: env('FIREBASE_DATABASE_URL', ''),
        web: {
          api_key: env('FIREBASE_API_KEY', ''),
          auth_domain: env('FIREBASE_AUTH_DOMAIN', ''),
          app_id: env('FIREBASE_APP_ID', ''),
        },
      },

      /**
       * Polling Realtime Transport
       *
       * Nothing is pushed; clients poll on this interval (ms) instead.
       */
      polling: {
        interval: env('REALTIME_POLL_INTERVAL', 5000),
      },
    },
  }
}

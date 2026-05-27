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
                from: env('MAIL_FROM_ADDRESS', 'no-reply@example.com'),
                test_address: env('MAIL_TEST_ADDRESS'),
            },
            sms: {
                transport: 'africastalking',
                from: env('SMS_FROM', env('AFRICASTALKING_SENDER_ID', env('TWILIO_FROM'))),
            },
            db: {
                table: 'user_notifications',
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
        }
    }
}

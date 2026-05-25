import { NotificationConfig } from '@arkstack/notifications'

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
                transport: 'smtp',
                from: env('SMTP_FROM_ADDRESS', 'no-reply@example.com'),
                test_address: env('SMTP_TEST_ADDRESS'),
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
                host: env('SMTP_HOST', 'localhost'),
                port: env('SMTP_PORT', 1025),
                secure: env('SMTP_SECURE', false),
                auth: {
                    user: env('SMTP_USERNAME', 'user@example.com'),
                    pass: env('SMTP_PASSWORD', 'password'),
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
                directory: env('MAIL_NOTIFICATION_FILE_PATH', 'storage/framework/mails'),
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

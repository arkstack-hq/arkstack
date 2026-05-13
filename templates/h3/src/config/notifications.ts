export default () => {
    return {
        default_driver: env('NOTIFICATION_DRIVER', 'mail'),
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
            smtp: {
                host: env('SMTP_HOST', 'localhost'),
                port: env('SMTP_PORT', 1025),
                secure: env('SMTP_SECURE', false),
                auth: {
                    user: env('SMTP_USERNAME', 'user@example.com'),
                    pass: env('SMTP_PASSWORD', 'password'),
                },
            },
            africastalking: {
                username: env('AFRICASTALKING_USERNAME', 'sandbox'),
                apiKey: env('AFRICASTALKING_API_KEY', 'sandbox'),
                senderId: env('AFRICASTALKING_SENDER_ID', env('SMS_FROM', 'Arkstack')),
            },
            twilio: {
                accountSid: env('TWILIO_ACCOUNT_SID'),
                authToken: env('TWILIO_AUTH_TOKEN'),
                from: env('TWILIO_FROM', env('SMS_FROM')),
            },
        }
    }
}

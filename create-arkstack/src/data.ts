export const filesToRemove = [
    'src/app',
    'src/app/http/controllers',
    'src/app/http/resources',
    'src/models',
    'src/app/models',
    'database',
    'src/routes/api.ts',
    'src/database',
    'src/core/database.ts',
    'src/config/filesystem.ts',
    'src/config/notifications.ts',
    'prisma',
    'prisma.config.ts',
    'arkorm.config.ts',
    'arkormx.config.ts',
    'arkorm.config.js',
    'arkormx.config.js',
    'arkorm.config.mjs',
    'arkormx.config.mjs',
]

export const fullDependencies = [
    '@types/pg',
    '@prisma/client',
    '@prisma/adapter-pg',
    '@arkstack/auth',
    '@arkstack/database',
    '@arkstack/filesystem',
    '@arkstack/notifications',
    'pg',
    'kysely',
    'prisma',
    'arkormx',
]

export const leanDependencies = [
    // '@arkstack/console-slim', Depracated
]

export const depsList: Record<string, string> = {
    '@arkstack/auth': '^0.12.10',
    '@arkstack/common': '^0.12.10',
    '@arkstack/console': '^0.12.10',
    '@arkstack/foundry': '^0.12.10',
    // '@arkstack/console-slim': '^0.12.10', Depracated
    '@arkstack/contract': '^0.12.10',
    '@arkstack/database': '^0.12.10',
    '@arkstack/driver-express': '^0.12.10',
    '@arkstack/driver-h3': '^0.12.10',
    '@arkstack/filesystem': '^0.12.10',
    '@arkstack/http': '^0.12.10',
    '@arkstack/view': '^0.12.10',
    '@arkstack/notifications': '^0.12.10',
}

export const environment = {
    min: [
        'APP_URL',
        'APP_PORT',
    ],
    max: [
        'APP_NAME',
        'JWT_SECRET',
        'JWT_EXPIRES_IN',
        'DATABASE_URL',
        'JWT_SECRET',
        'TWO_FACTOR_ENCRYPTION_KEY',
        'MAIL_HOST',
        'MAIL_PORT',
        'MAIL_SECURE',
        'MAIL_USERNAME',
        'MAIL_PASSWORD',
        'MAIL_FROM_ADDRESS',
        'MAIL_TEST_ADDRESS',
    ],
}
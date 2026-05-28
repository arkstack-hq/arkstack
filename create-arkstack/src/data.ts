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
    '@arkstack/auth': '^0.11.3',
    '@arkstack/common': '^0.11.3',
    '@arkstack/console': '^0.11.3',
    '"@arkstack/foundry': '^0.10.10',
    // '@arkstack/console-slim': '^0.11.3', Depracated
    '@arkstack/contract': '^0.11.3',
    '@arkstack/database': '^0.11.3',
    '@arkstack/driver-express': '^0.11.3',
    '@arkstack/driver-h3': '^0.11.3',
    '@arkstack/filesystem': '^0.11.3',
    '@arkstack/http': '^0.11.3',
    '@arkstack/view': '^0.11.3',
    '@arkstack/notifications': '^0.11.3',
}

export const environment = {
    min: [
        'APP_URL',
        'APP_PORT',
    ],
    max: [
        'JWT_SECRET',
        'JWT_EXPIRES_IN',
        'DATABASE_URL',
    ],
}
export const filesToRemove = [
    'src/app/http/controllers',
    'src/app/http/resources',
    'src/models',
    'src/app/models',
    'database',
    'src/routes/api.ts',
    'src/database',
    'src/core/database.ts',
    'src/core/utils/drivers/ValidatorDBDriver.ts',
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
    '@prisma/adapter-pg',
    '@arkstack/console',
    '@prisma/client',
    '@types/pg',
    'pg',
    'kysely',
    'prisma',
    'arkormx',
]

export const leanDependencies = {
    '@arkstack/console-slim': '^0.4.3',
}

export const depsList: Record<string, string> = {
    '@arkstack/http': '^0.4.3',
    '@arkstack/view': '^0.4.3',
    '@arkstack/auth': '^0.4.3',
    '@arkstack/common': '^0.4.3',
    '@arkstack/console': '^0.4.3',
    '@arkstack/contract': '^0.4.3',
    '@arkstack/driver-h3': '^0.4.3',
    '@arkstack/filesystem': '^0.4.3',
    '@arkstack/driver-express': '^0.4.3',
    '@arkstack/notifications': '^0.4.3',
}

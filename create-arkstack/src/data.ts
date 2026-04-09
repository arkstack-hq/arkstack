export const filesToRemove = [
    'src/app/http/controllers',
    'src/app/http/resources',
    'src/models',
    'database',
    'src/routes/api.ts',
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

export const depsToRemove = [
    '@prisma/adapter-pg',
    '@arkstack/console',
    '@prisma/client',
    '@types/pg',
    'pg',
    'prisma',
    'arkormx',
]

export const depsToAdd = {
    '@arkstack/console-slim': '^0.3.12',
}

export const depsList: Record<string, string> = {
    '@arkstack/common': '^0.3.12',
    '@arkstack/console': '^0.3.12',
    '@arkstack/contract': '^0.3.12',
    '@arkstack/driver-h3': '^0.3.12',
    '@arkstack/filesystem': '^0.3.12',
    '@arkstack/driver-express': '^0.3.12',
}
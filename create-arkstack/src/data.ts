export const filesToRemove = [
    'src/app',
    'src/models',
    'database',
    'src/routes/api.ts',
    'src/core/database.ts',
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
    '@arkstack/console-slim': '^0.1.26',
}

export const depsList: Record<string, string> = {
    '@arkstack/common': '^0.1.26',
    '@arkstack/console': '^0.1.26',
    '@arkstack/contract': '^0.1.26',
    '@arkstack/driver-h3': '^0.1.26',
    '@arkstack/driver-express': '^0.1.26'
}
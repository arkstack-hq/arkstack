import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { createArkormCurrentPageResolver } from 'resora'
import { defineConfig } from 'arkormx'

export default defineConfig({
    paths: {
        models: './src/app/models',
        factories: './src/database/factories',
        seeders: './src/database/seeders',
        migrations: './src/database/migrations',
        buildOutput: './dist',
    },
    outputExt: 'ts',
    prisma: () => {
        return new PrismaClient({
            adapter: new PrismaPg({
                connectionString: process.env.DATABASE_URL,
            }),
        })
    },
    pagination: {
        resolveCurrentPage: createArkormCurrentPageResolver(),
    },
})
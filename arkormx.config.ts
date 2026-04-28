import 'dotenv/config'

import { Kysely, PostgresDialect } from 'kysely'
import { createKyselyAdapter, defineConfig } from 'arkormx'

import { Pool } from 'pg'
import { createArkormCurrentPageResolver } from 'resora'

const db = new Kysely<Record<string, never>>({
    dialect: new PostgresDialect({
        pool: new Pool({
            connectionString: process.env.DATABASE_URL,
        }),
    }),
})

export default defineConfig({
    paths: {
        models: './src/models',
        factories: './database/factories',
        seeders: './database/seeders',
        migrations: './database/migrations',
        buildOutput: './dist',
    },
    outputExt: 'ts',
    adapter: createKyselyAdapter(db),
    pagination: {
        resolveCurrentPage: createArkormCurrentPageResolver(),
    },
})
import 'dotenv/config'

import { Kysely, PostgresDialect } from 'kysely'
import { createKyselyAdapter, defineConfig } from 'arkormx'

import { Pool } from 'pg'
import { createArkormCurrentPageResolver } from 'resora'
import path from 'node:path'

const db = new Kysely<Record<string, never>>({
    dialect: new PostgresDialect({
        pool: new Pool({
            connectionString: process.env.DATABASE_URL,
        }),
    }),
})

export default defineConfig({
    paths: {
        models: path.join(process.cwd(), '/database/models'),
        factories: path.join(process.cwd(), '/database/factories'),
        seeders: path.join(process.cwd(), '/database/seeders'),
        migrations: path.join(process.cwd(), '/database/migrations'),
        buildOutput: './dist',
    },
    outputExt: 'ts',
    adapter: createKyselyAdapter(db),
    pagination: {
        resolveCurrentPage: createArkormCurrentPageResolver(),
    },
})
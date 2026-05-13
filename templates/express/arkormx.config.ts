import 'dotenv/config'

import { Kysely, PostgresDialect } from 'kysely'
import { createKyselyAdapter, defineConfig } from 'arkormx'

import { Pool } from 'pg'
import { createArkormCurrentPageResolver } from 'resora'
import { outputDir } from '@arkstack/common'
import path from 'node:path'

const dist = path.relative(process.cwd(), outputDir())

const db = new Kysely<Record<string, never>>({
    dialect: new PostgresDialect({
        pool: new Pool({
            connectionString: process.env.DATABASE_URL,
        }),
    }),
})

export default defineConfig({
    paths: {
        models: './src/app/models',
        factories: './src/database/factories',
        seeders: './src/database/seeders',
        migrations: './src/database/migrations',
        buildOutput: dist,
    },
    outputExt: 'ts',
    adapter: createKyselyAdapter(db),
    pagination: {
        resolveCurrentPage: createArkormCurrentPageResolver(),
    },
})
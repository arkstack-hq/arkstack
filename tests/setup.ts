import { Kysely, PostgresDialect } from 'kysely'
import { Model, createKyselyAdapter } from 'arkormx'

import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true })

Model.setAdapter(createKyselyAdapter(new Kysely<Record<string, never>>({
    dialect: new PostgresDialect({
        pool: new Pool({
            connectionString: process.env.DATABASE_URL,
        }),
    }),
})))
import { Pool, type PoolConfig } from 'pg'

import { Kysely, PostgresDialect } from 'kysely'

import type { ConnectionConfig } from './types'
import { createKyselyAdapter } from 'arkormx'

/**
 * Build a pg {@link Pool} from a {@link ConnectionConfig}. A `url` (or
 * `DATABASE_URL`) wins over the discrete `host`/`port`/`user`/... fields.
 * 
 * @param connection 
 * @returns 
 */
export const createPool = (connection: ConnectionConfig): Pool => {
    const poolConfig: PoolConfig = connection.url
        ? { connectionString: connection.url }
        : {
            host: connection.host,
            port: connection.port,
            user: connection.user,
            database: connection.database,
            password: connection.password,
        }

    if (connection.ssl !== undefined) {
        poolConfig.ssl = connection.ssl as PoolConfig['ssl']
    }

    if (connection.pool?.max !== undefined) {
        poolConfig.max = connection.pool.max
    }

    if (connection.pool?.idleTimeoutMillis !== undefined) {
        poolConfig.idleTimeoutMillis = connection.pool.idleTimeoutMillis
    }

    if (connection.pool?.connectionTimeoutMillis !== undefined) {
        poolConfig.connectionTimeoutMillis = connection.pool.connectionTimeoutMillis
    }

    return new Pool(poolConfig)
}

/**
 * Build a Kysely instance for the given connection using the Postgres dialect.
 * 
 * @param connection 
 * @returns 
 */
export const createKysely = <DB = Record<string, never>> (connection: ConnectionConfig): Kysely<DB> => {
    return new Kysely<DB>({
        dialect: new PostgresDialect({ pool: createPool(connection) }),
    })
}

/**
 * Build an ArkORM Kysely adapter for the given connection. This is what binds
 * models to the database.
 * 
 * @param connection 
 * @returns 
 */
export const createAdapter = (connection: ConnectionConfig) => {
    return createKyselyAdapter(createKysely(connection))
}

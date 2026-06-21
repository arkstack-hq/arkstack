import { DatabaseConfig } from '@arkstack/database'
import { env } from '@arkstack/common'

export default (): DatabaseConfig => {
    return {
        /**
         * Default Database Connection
         *
         * The connection used whenever one is not explicitly requested.
         * Supported drivers: postgres.
         */
        default: env('DB_CONNECTION', 'pgsql'),

        /**
         * Database Connections
         *
         * Credentials are provided as discrete fields. When `url` (or
         * `DATABASE_URL`) is set it takes precedence over the discrete fields.
         */
        connections: {
            pgsql: {
                driver: 'postgres',
                url: env('DATABASE_URL'),
                host: env('DB_HOST', '127.0.0.1'),
                port: env('DB_PORT', 5432),
                user: env('DB_USERNAME', 'postgres'),
                database: env('DB_DATABASE', 'arkstack'),
                password: env('DB_PASSWORD', 'postgres'),
            },
        },
    }
}

/**
 * A connection password. pg accepts a static string or a (possibly async)
 * function that resolves one, which is useful for rotating credentials / IAM
 * auth tokens.
 */
export type ConnectionPassword = string | (() => string | Promise<string>)

/**
 * A single database connection's settings.
 *
 * Credentials are provided as discrete fields (`host`, `port`, `user`,
 * `database`, `password`). When `url` (or `DATABASE_URL`) is set it takes
 * precedence and the discrete fields are ignored.
 */
export interface ConnectionConfig {
    /** The SQL driver. Only `postgres` is wired up today. */
    driver?: 'postgres' | 'pgsql'
    /** A full connection string. Overrides the discrete fields when set. */
    url?: string
    host?: string
    port?: number
    user?: string
    database?: string
    password?: ConnectionPassword
    /** pg SSL options: `true`, or a TLS options object. */
    ssl?: boolean | Record<string, unknown>
    /** pg pool tuning. */
    pool?: {
        max?: number
        idleTimeoutMillis?: number
        connectionTimeoutMillis?: number
    }
}

/**
 * Apps may augment this registry to type their named connections.
 */
export interface CustomConnectionRegistry { }

export interface DatabaseConfig {
    /**
     * The name of the connection used when none is requested.
     */
    default: string

    /**
     * The configured connections, keyed by the name referenced by `default` and
     * by the model/query APIs.
     */
    connections: Record<string, ConnectionConfig> & CustomConnectionRegistry
}

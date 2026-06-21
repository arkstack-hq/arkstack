import { ConnectionConfig, DatabaseConfig } from './types'
import { DotPath, DotPathValue, config } from '@arkstack/common'

/**
 * Read a value from the `database` configuration namespace with a fallback.
 *
 * Never throws when the config file is missing; returns the default instead.
 *
 * @param key           Dot path within the database config.
 * @param defaultValue  Value returned when the key is not set.
 */
export const configure = <T extends DotPath<DatabaseConfig>> (
    key: T,
    defaultValue: unknown,
): DotPathValue<DatabaseConfig, T> => {
    try {
        return config(`database.${key}`, defaultValue) as never
    } catch {
        return defaultValue as never
    }
}

/**
 * Resolve a configured {@link ConnectionConfig} by name, or the default
 * connection when none is given.
 *
 * @param name  The connection name. Defaults to `database.default`.
 * @throws when the named connection is not configured.
 */
export const resolveConnection = (name?: string): ConnectionConfig => {
    const connection = name ?? (configure('default', 'pgsql'))
    const connections = configure('connections', {})
    const resolved = connections[connection]

    if (!resolved) {
        throw new Error(`Database connection "${connection}" is not configured.`)
    }

    return resolved
}

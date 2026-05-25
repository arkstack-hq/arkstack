import type { PersistentSessionConfig, SessionDriver } from './types'

import { CookieSessionDriver } from './drivers/CookieSessionDriver'
import { DatabaseSessionDriver } from './drivers/DatabaseSessionDriver'
import { FileSessionDriver } from './drivers/FileSessionDriver'

let configuredDriver: SessionDriver | undefined

const readAppSessionConfig = (): PersistentSessionConfig | undefined => {
    try {
        if (!globalThis.config) return

        return {
            driver: config('session.driver', 'cookie'),
            cookie: config('session.cookie', 'arkstack_session'),
            secret: config('session.secret'),
            ttl: config('session.ttl', 60 * 60 * 24 * 7),
            cookie_options: {
                path: config('session.path', '/'),
                httpOnly: config('session.http_only', true),
                secure: config('session.secure', true),
                sameSite: config('session.same_site', 'Lax'),
            },
            file: {
                directory: config('session.directory')
            },
            database: {
                table: config('session.table', 'sessions')
            },
        }
    } catch {
        return undefined
    }
}

export const createSessionDriver = (
    config: PersistentSessionConfig = {},
): SessionDriver => {
    if (config.driver && typeof config.driver !== 'string') return config.driver

    const common = {
        cookie: config.cookie,
        secret: config.secret,
        ttl: config.ttl,
        cookie_options: config.cookie_options,
    }

    switch (config.driver || 'cookie') {
        case 'file':
            return new FileSessionDriver({
                ...common,
                directory: config.file?.directory,
            })
        case 'database':
            return new DatabaseSessionDriver({
                ...common,
                table: config.database?.table,
            })
        case 'cookie':
        default:
            return new CookieSessionDriver(common)
    }
}

export const configureSession = (
    config: PersistentSessionConfig | SessionDriver,
) => {
    configuredDriver =
        typeof (config as SessionDriver).start === 'function'
            ? (config as SessionDriver)
            : createSessionDriver(config as PersistentSessionConfig)

    return configuredDriver
}

export const getSessionDriver = () => {
    if (!configuredDriver)
        configuredDriver = createSessionDriver(readAppSessionConfig())

    return configuredDriver
}

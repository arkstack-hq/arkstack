import { Arkorm, DB, Model, defineConfig } from 'arkormx'

import type { ArkormConfig } from 'arkormx'
import { Arkstack } from '@arkstack/contract'
import type { DatabaseConfig } from './types'
import { createAdapter } from './kysely'
import { createArkormCurrentPageResolver } from 'resora'
import { existsSync } from 'node:fs'
import { outputDir } from '@arkstack/common'
import path from 'node:path'
import { resolveConnection } from './config'

/**
 * Default ArkORM paths matching the scaffolded application structure. Apps with
 * a different layout can override them by adding an `arkormx.config.ts`.
 */
const defaultPaths = (): NonNullable<ArkormConfig['paths']> => {
    const dist = path.relative(Arkstack.rootDir(), outputDir())

    return {
        models: './src/app/models',
        factories: './src/database/factories',
        seeders: './src/database/seeders',
        migrations: './src/database/migrations',
        buildOutput: dist,
    }
}

/**
 * Whether the application provides its own `arkormx.config.{ts,js}`. When it
 * does, ArkORM loads it and it takes precedence over the framework defaults.
 */
const hasUserArkormConfig = (): boolean => {
    const root = Arkstack.rootDir()

    return existsSync(path.join(root, 'arkormx.config.ts'))
        || existsSync(path.join(root, 'arkormx.config.js'))
}

export interface DefineArkormConfigOptions extends Partial<ArkormConfig> {
    /**
     * The application's database configuration. When provided (and no explicit
     * `adapter` is set), the adapter is built from the resolved connection.
     */
    database?: DatabaseConfig
    /**
     * The connection name to bind. Defaults to `database.default`.
     */
    connection?: string
}

/**
 * Build the ArkORM config object for an application from its database
 * configuration. Use this only when authoring an explicit `arkormx.config.ts`;
 * by default the framework configures ArkORM for you (see {@link bootArkorm}).
 *
 * @param options  Arkorm config plus the app's database config.
 */
export const defineArkormConfig = (options: DefineArkormConfigOptions = {}) => {
    const { database, connection, adapter, pagination, ...rest } = options

    let resolvedAdapter = adapter

    if (!resolvedAdapter && database) {
        const name = connection ?? database.default
        const resolved = database.connections[name]

        if (!resolved) {
            throw new Error(`Database connection "${name}" is not configured.`)
        }

        resolvedAdapter = createAdapter(resolved)
    }

    return defineConfig({
        ...rest,
        ...(resolvedAdapter ? { adapter: resolvedAdapter } : {}),
        pagination: {
            resolveCurrentPage: createArkormCurrentPageResolver(),
            ...(pagination ?? {}),
        },
    })
}

export interface BootArkormOptions extends Partial<ArkormConfig> {
    /** The connection name to bind. Defaults to `database.default`. */
    connection?: string
}

/**
 * Configure ArkORM natively from `src/config/database.ts`, so applications work
 * without an `arkormx.config.ts`.
 *
 * Builds the adapter from the default (or named) connection, registers the
 * conventional paths and the resora pagination resolver, and binds models. A
 * user-provided `arkormx.config.{ts,js}` always wins — in that case this is a
 * no-op and ArkORM loads the file instead.
 *
 * @param options  Optional overrides merged over the derived config.
 * @returns        Whether the framework applied its configuration.
 */
export const bootArkorm = (options: BootArkormOptions = {}): boolean => {
    if (hasUserArkormConfig()) {
        return false
    }

    const { connection, adapter, paths, pagination, ...rest } = options
    const resolvedAdapter = adapter ?? createAdapter(resolveConnection(connection))

    Arkorm.configure({
        adapter: resolvedAdapter,
        paths: { ...defaultPaths(), ...(paths ?? {}) },
        pagination: {
            resolveCurrentPage: createArkormCurrentPageResolver(),
            ...(pagination ?? {}),
        },
        outputExt: 'ts',
        ...rest,
    })

    Model.setAdapter(resolvedAdapter)
    DB.setAdapter(resolvedAdapter)

    return true
}

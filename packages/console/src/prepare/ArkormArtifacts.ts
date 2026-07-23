import { existsSync, readdirSync } from 'node:fs'

import { Arkstack } from '@arkstack/contract'
import path from 'node:path'

type MigrationClass = new (...args: any[]) => any
type CliApp = {
    getConfig: (key: string) => any
    resolveRuntimeDirectoryPath: (directory: string) => string
    resolveRuntimeScriptPath: (file: string) => string
    syncModelRegistry: () => unknown
}
type ArkormModule = {
    CliApp: new () => CliApp
    RuntimeModuleLoader: {
        load: <T = unknown>(file: string) => Promise<T>
    }
    getRegisteredMigrations: () => MigrationClass[]
    getRegisteredPaths: (key?: string) => string[] | Record<string, string[]>
    loadArkormConfig: () => Promise<void>
    readAppliedMigrationsStateFromStore: (adapter: unknown, stateFilePath: string) => Promise<any>
    resolveMigrationStateFilePath: (cwd: string, configuredPath?: string) => string
    resolvePersistedMetadataFeatures: (features?: unknown) => unknown
    syncPersistedColumnMappingsFromState: (
        cwd: string,
        state: any,
        availableMigrations: [MigrationClass, string][],
        features: unknown,
    ) => Promise<void>
}

const runtimeImport = async <T = any>(specifier: string): Promise<T> => {
    const importer = new Function('specifier', 'return import(specifier)') as (value: string) => Promise<T>

    return await importer(specifier)
}

const isMigrationClass = (value: unknown): value is MigrationClass => {
    if (typeof value !== 'function') return false

    const prototype = (value as { prototype?: Record<string, unknown> }).prototype

    return typeof prototype?.up === 'function' && typeof prototype?.down === 'function'
}

const loadArkorm = async (): Promise<ArkormModule | undefined> => {
    try {
        return await runtimeImport<ArkormModule>('arkormx')
    } catch {
        return undefined
    }
}

const bootArkormDefaults = async (): Promise<void> => {
    try {
        const database = await runtimeImport<{ bootArkorm: () => boolean }>('@arkstack/database')

        database.bootArkorm()
    } catch {
        // Database is optional for console-only applications.
    }
}

export class ArkormArtifacts {
    static async sync(): Promise<void> {
        const arkorm = await loadArkorm()
        if (!arkorm) return

        await bootArkormDefaults()

        try {
            await arkorm.loadArkormConfig()
        } catch {
            // Apps without an explicit arkormx config still use database boot defaults.
        }

        const app = new arkorm.CliApp()

        ArkormArtifacts.syncModelRegistry(arkorm, app)
        await ArkormArtifacts.syncColumnMappings(arkorm, app)
    }

    private static syncModelRegistry(
        _arkorm: ArkormModule,
        app: CliApp,
    ): void {
        try {
            app.syncModelRegistry()
        } catch (error) {
            ArkormArtifacts.warn('model registry', error)
        }
    }

    private static async syncColumnMappings(
        arkorm: ArkormModule,
        app: CliApp,
    ): Promise<void> {
        try {
            const migrations = await ArkormArtifacts.loadMigrations(arkorm, app)
            const statePath = arkorm.resolveMigrationStateFilePath(Arkstack.rootDir())
            const adapter = app.getConfig('adapter')
            const state = await arkorm.readAppliedMigrationsStateFromStore(adapter, statePath)
            const features = arkorm.resolvePersistedMetadataFeatures(app.getConfig('features'))

            await arkorm.syncPersistedColumnMappingsFromState(
                Arkstack.rootDir(),
                state,
                migrations,
                features,
            )
        } catch (error) {
            ArkormArtifacts.warn('column mappings', error)
        }
    }

    private static async loadMigrations(
        arkorm: ArkormModule,
        app: CliApp,
    ): Promise<[MigrationClass, string][]> {
        const configuredMigrationsDir =
            app.getConfig('paths')?.migrations ?? path.join(Arkstack.rootDir(), 'src/database/migrations')
        const registeredPaths = arkorm.getRegisteredPaths('migrations') as string[]
        const directories = [
            configuredMigrationsDir,
            ...registeredPaths,
        ]
            .map((directory) => app.resolveRuntimeDirectoryPath(directory))
            .filter((directory, index, all) => existsSync(directory) && all.indexOf(directory) === index)

        const files = directories.flatMap((directory) =>
            readdirSync(directory)
                .filter((file) => /\.(ts|js|mjs|cjs)$/i.test(file))
                .sort((left, right) => left.localeCompare(right))
                .map((file) => app.resolveRuntimeScriptPath(path.join(directory, file))),
        )

        const loaded = await Promise.all(
            files.map(async (file) => {
                const module = await arkorm.RuntimeModuleLoader.load<Record<string, unknown>>(file)
                const migrations = Object.values(module).filter(isMigrationClass)

                return migrations.map((migration) => [migration, file] as [MigrationClass, string])
            }),
        )

        return [
            ...loaded.flat(),
            ...arkorm.getRegisteredMigrations().map(
                (migration) => [migration, `registered:${migration.name}`] as [MigrationClass, string],
            ),
        ]
    }

    private static warn(artifact: string, error: unknown): void {
        const message = error instanceof Error ? error.message : String(error)

        console.warn(`[arkstack:prepare] Unable to sync ArkORM ${artifact}: ${message}`)
    }
}

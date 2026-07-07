import { Arr, Obj, undot } from '@h3ravel/support'
import { ConfigRegistry, DotPath } from './types'
import { Dirent, readdirSync } from 'node:fs'

import { Arkstack } from '@arkstack/contract'
import { EnvLoader } from './EnvLoader'
import { createRequire } from 'module'
import { outputDir } from './system'
import path from 'node:path'

export const CONFIG_KEY = Symbol('globalConfig');
(globalThis as any)[CONFIG_KEY] = {}

/**
 * Loads and resolves application configuration from the config directory.
 *
 * Config modules are read once (lazily) from the output directory and cached on
 * a global symbol, then queried by dot-path. A partial config object can also be
 * merged in at runtime.
 */
export class ConfigLoader {
    /** 
     * The cached config store, shared across instances via a global symbol.
     */
    private get store(): Record<string, any> {
        return (globalThis as any)[CONFIG_KEY]
    }

    private set store(value: Record<string, any>) {
        (globalThis as any)[CONFIG_KEY] = value
    }

    /** 
     * Read and cache config modules from the config directory on first use.
     */
    private load(): void {
        if (Object.entries(this.store).length >= 1) {
            return
        }

        let files: Dirent<string>[]
        const require = createRequire(import.meta.url)
        const configDir = this.resolveConfigDir()

        try {
            files = readdirSync(configDir, {
                withFileTypes: true,
            }).filter((file) => {
                if (file.name.includes('middleware') && globalThis.arkctx?.runtime === 'CLI')
                    return false

                return (
                    file.isFile() && (file.name.endsWith('.js') || file.name.endsWith('.ts'))
                )
            })
        } catch {
            files = [] as Dirent<string>[]
        }

        Object.assign(this.store, files.reduce(
            (configs, file) => {
                const configName = path.basename(file.name, path.extname(file.name))

                try {
                    configs[configName] = require(
                        path.join(file.parentPath, file.name),
                    ).default(typeof globalThis.app === 'function' ? globalThis.app() : {})
                } catch (error) {
                    // A single config module that can't be loaded (e.g. not yet
                    // built for this environment) must not crash app boot — skip
                    // it, matching the tolerance already applied to a missing
                    // config directory above.
                    console.warn(
                        `[arkstack] Skipped config "${configName}": ${(error as Error).message}`,
                    )
                }

                return configs
            },
            {} as Record<string, any>,
        ))
    }

    /**
     * Resolve the directory to load config modules from.
     *
     * Prefers an explicit `CONFIG_PATH`, then the environment-selected output
     * directory. Falls back to the other build output (`dist` ⇄
     * `.arkstack/build`) so config still loads if the selected directory is
     * missing or transiently emptied — e.g. a concurrent rebuild (`clean: true`)
     * during a test run.
     */
    private resolveConfigDir(): string {
        const root = Arkstack.rootDir()
        const explicit = env('CONFIG_PATH')

        if (explicit) return explicit

        const candidates = [
            path.join(outputDir(), 'config'),
            path.join(root, env('OUTPUT_DIR', 'dist'), 'config'),
            path.join(root, env('OUTPUT_DIR_DEV', '.arkstack/build'), 'config'),
        ]

        const populated = candidates.find((dir) => {
            try {
                return readdirSync(dir).some(
                    (file) => file.endsWith('.js') || file.endsWith('.ts'),
                )
            } catch {
                return false
            }
        })

        return populated ?? candidates[0]
    }

    /**
     * Resolve configuration: read a dot-path value, merge a partial config
     * object, or return the whole config.
     *
     * @param key           Dot-path to read, or an object to merge in.
     * @param defaultValue  Returned when a string key is not found.
     */
    resolve<X extends ConfigRegistry | unknown = unknown, P extends DotPath<X> | undefined = undefined>(
        key?: P,
        defaultValue?: any
    ): any {
        if (typeof globalThis.env === 'undefined') {
            globalThis.env = (k?: string, def?: any): any => new EnvLoader().get(k ?? '', def)
        }

        this.load()

        if (typeof key === 'object' && key !== null) {
            this.store = undot(Object.assign(
                {},
                Arr.dot(this.store),
                Arr.dot(key as Record<string, unknown>),
            ))
        } else if (typeof key === 'string') {
            return Obj.get(this.store, key as never, defaultValue)
        }

        return this.store
    }
}

/** 
 * Shared config loader backing {@link config}.
 */
export const configLoader = new ConfigLoader()

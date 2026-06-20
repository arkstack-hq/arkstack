import { Arr, Obj, undot } from '@h3ravel/support'
import { ConfigRegistry, DotPath, FileImporter, GlobalConfig, GlobalEnv } from './types'
import { JitiOptions, JitiResolveOptions, createJiti } from 'jiti'

import { Arkstack } from '@arkstack/contract'
import { Dirent } from 'node:fs'
import { createRequire } from 'module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { readdirSync } from 'fs'
import { resolve } from 'node:path'
import { rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'

/**
 * Read the .env file
 *
 * @param env
 * @param def
 * @returns
 */
export const env: GlobalEnv = <X = string, Y = undefined | X> (
    env: string,
    defaultValue?: Y,
) => {
    let val: string | number | boolean | undefined | null =
        process.env[env] ?? ''

    if ([true, 'true', 'on', false, 'false', 'off'].includes(val)) {
        val = [true, 'true', 'on'].includes(val)
    }

    if (
        !isNaN(Number(val)) &&
        typeof val !== 'boolean' &&
        typeof val !== 'undefined' &&
        val !== ''
    ) {
        val = Number(val)
    }

    if (val === '') {
        val = undefined
    }

    if (val === 'null') {
        val = null
    }

    val ??= defaultValue as typeof val

    return val as Y extends undefined ? X : Y
}

/**
 * Build the app url
 *
 * @param link
 * @returns
 */
export const appUrl = (link?: string): string => {
    const port = env('PORT', env('APP_PORT', '3000'))
    const defaultUrl = `http://localhost:${port}`
    const appUrl = env('APP_URL', `http://localhost:${port}`)

    try {
        const url = new URL(appUrl)
        // Append port only if APP_URL has a port or is localhost
        if (url.port || url.hostname === 'localhost') {
            url.port = port
        }
        // Remove trailing slash from base URL
        const baseUrl = url.toString().replace(/\/$/, '')
        // Append link with proper path separator
        if (link) {
            // Ensure link starts with '/' and remove duplicate slashes
            const normalizedLink = `/${link.replace(/^\/+/, '')}`

            return `${baseUrl}${normalizedLink}`
        }

        return baseUrl
    } catch {
        // Return default URL with link if provided
        return link ? `${defaultUrl}/${link.replace(/^\/+/, '')}` : defaultUrl
    }
}

export const CONFIG_KEY = Symbol('globalConfig');
(globalThis as any)[CONFIG_KEY] = {}

/**
 * Gets the application configuration.
 *
 * @param key             The configuration key to retrieve.
 * @param defaultValue    The default value to return if the key is not found.
 * @returns               The configuration value.
 */
export const config: GlobalConfig = <
    X extends ConfigRegistry,
    P extends DotPath<X> | undefined = undefined,
> (
    key?: P,
    defaultValue?: any,
) => {
    if (typeof globalThis.env === 'undefined') {
        globalThis.env = (key?: string, def?: any): any => key
            ? process.env[key] ?? def
            : process.env
    }

    const config = (globalThis as any)[CONFIG_KEY]

    if (Object.entries(config).length < 1) {
        let files: Dirent<string>[]
        const dist = path.relative(Arkstack.rootDir(), outputDir())
        const require = createRequire(import.meta.url)
        const configDir = env('CONFIG_PATH', path.join(Arkstack.rootDir(), `${dist}/config`))

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

        Object.assign(config, files.reduce(
            (configs, file) => {
                const configName = path.basename(file.name, path.extname(file.name))

                configs[configName] = require(
                    path.join(file.parentPath, file.name),
                ).default(typeof globalThis.app === 'function' ? globalThis.app() : {})

                return configs
            },
            {} as Record<string, any>,
        ) as X);

        (globalThis as any)[CONFIG_KEY] = config
    }

    if (typeof key === 'object' && key !== null) {
        const config = Object.assign(
            {},
            Arr.dot((globalThis as any)[CONFIG_KEY]),
            Arr.dot(key),
        );

        (globalThis as any)[CONFIG_KEY] = undot(config)
    } else if (typeof key === 'string') {
        return Obj.get((globalThis as any)[CONFIG_KEY], key as never, defaultValue)
    }

    return (globalThis as any)[CONFIG_KEY]
}

/**
 * Gets the current Node environment (development or production).
 *
 * @returns
 */
export const nodeEnv = () => {
    let envValue = env<'development' | 'production'>('NODE_ENV', 'development')

    if (envValue !== 'development' && envValue !== 'production') {
        envValue = 'development'
    }

    return envValue === 'production' ? 'prod' : 'dev'
}

/**
 * Gets the output directory for the application based on the current environment.
 *
 * @param cwd  The current working directory (optional, defaults to Arkstack.rootDir()).
 * @returns
 */
export const outputDir = (cwd?: string) => {
    cwd ??= Arkstack.rootDir()

    const NODE_ENV = nodeEnv()

    const output = {
        dev: env('OUTPUT_DIR_DEV', '.arkstack/build'),
        prod: env('OUTPUT_DIR', 'dist'),
    }

    return path.isAbsolute(output[NODE_ENV] ?? output.dev)
        ? (output[NODE_ENV] ?? output.dev)
        : path.join(cwd, output[NODE_ENV] ?? output.dev)
}

/**
 * Rebuild the application output (tsdown) into {@link outputDir}, wiping it first
 * so no stale emitted modules survive a source change. Standalone — it does NOT
 * boot the app — so the console kernel can call it to self-heal a stale or
 * incomplete build artifact that would otherwise wedge startup. Build-only: it
 * sets `CLI_BUILD` so tsdown emits without starting a watcher/dev server, and
 * inherits the current `NODE_ENV` so it targets the same dir the kernel reads.
 */
export const rebuildOutput = async (): Promise<void> => {
    await rm(outputDir(), { recursive: true, force: true })

    await new Promise<void>((resolveBuild, reject) => {
        const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
        const child = spawn(command, ['exec', 'tsdown', '--log-level', 'silent'], {
            cwd: Arkstack.rootDir(),
            stdio: 'inherit',
            env: Object.assign({}, process.env, { CLI_BUILD: 'true' }),
        })

        child.on('error', reject)
        child.on('exit', (code) => {
            if (code === 0 || code === null) {
                resolveBuild()

                return
            }

            reject(new Error(`tsdown exited with code ${code}`))
        })
    })
}

/**
 * 
 * Dynamically imports a file at the given path with full TypeScript support,
 * including `tsconfig.json` path aliases. 
 *
 * @param filePath - The path to the file to import. 
 * @returns The imported module typed as `T`.
 *
 * @example
 * const config = await importFile<AppConfig>('./config/app.ts')
 */
export const importFile: FileImporter = async <T = unknown> (
    filePath: string,
    userOptions?: JitiOptions | undefined,
    resolveOptions?: (JitiResolveOptions & { default?: true })
): Promise<T> => {
    const resolvedPath = resolve(filePath)
    const jiti = createJiti(pathToFileURL(resolvedPath).href, {
        ...userOptions,
        interopDefault: false,
        tsconfigPaths: true,
    })

    return await jiti.import<T>(resolvedPath, resolveOptions)
}

/**
 * Picks the command class out of an imported module. Prefers the export named
 * after the file (musket's discovery convention), then a default export, then
 * the first exported constructor it finds.
 *
 * @param mod        The imported module namespace.
 * @param basename   The file name without extension.
 * @returns          The resolved command class, or undefined when none is found.
 */
const resolveCommandExport = (
    mod: Record<string, unknown>,
    basename: string,
): unknown => {
    const named = mod[basename]

    if (typeof named === 'function') return named
    if (typeof mod.default === 'function') return mod.default

    return Object.values(mod).find((value) => typeof value === 'function')
}

/**
 * Discover console command classes from the application's command directory.
 *
 * Commands are loaded straight from TypeScript source through {@link importFile}
 * (jiti), so they are picked up without a build and reflect edits on every run.
 * The built output is only used as a fallback when the source directory is
 * absent — e.g. a production deploy that ships `dist` without `src`.
 *
 * This exists because musket's own glob discovery imports paths with native
 * `import()`, which silently skips `.ts` files — the reason commands previously
 * only appeared after a `build --dev` and never reflected later edits.
 *
 * @param subPath   Command directory relative to the app root (src/dist aware).
 * @returns         The discovered command classes.
 */
export const discoverCommands = async <T = unknown> (
    subPath: string = path.join('app', 'console', 'commands'),
): Promise<T[]> => {
    const root = Arkstack.rootDir()
    const dist = path.relative(root, outputDir())

    // Prefer source so edits land without a rebuild; fall back to built output.
    const candidateDirs = [
        path.join(root, 'src', subPath),
        path.join(root, dist, subPath),
    ]

    let commandsDir: string | undefined
    let files: Dirent<string>[] = []

    for (const dir of candidateDirs) {
        try {
            const entries = readdirSync(dir, { withFileTypes: true }).filter(
                (file) => file.isFile() && ['.ts', '.js', '.mjs'].includes(path.extname(file.name)),
            )

            if (entries.length > 0) {
                commandsDir = dir
                files = entries

                break
            }
        } catch {
            // Directory missing — try the next candidate.
        }
    }

    if (!commandsDir) return []

    const commands: T[] = []

    for (const file of files) {
        const basename = path.basename(file.name, path.extname(file.name))

        try {
            const mod = await importFile<Record<string, unknown>>(path.join(commandsDir, file.name))
            const command = resolveCommandExport(mod, basename)

            if (command) commands.push(command as T)
        } catch (error) {
            // Surface the failure so a broken command file is debuggable instead
            // of silently vanishing from the command list.
            console.error(`[arkstack] Failed to load command "${file.name}":`, error)
        }
    }

    return commands
}

/**
 * Resolves the default export from a module, handling both CJS and ESM interop.
 * In CJS modules, the default export is often the module itself (a function or object),
 * while in ESM the default is nested under the `default` property.
 *
 * @param imp - The imported module
 * @returns The resolved default export
 */
export const interopDefault = <T> (imp: T | { default: T }): T => {
    return typeof imp === 'function'
        ? imp as T
        : (imp as { default: T }).default
}
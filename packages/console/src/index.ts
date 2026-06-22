#!/usr/bin/env node

import { abort, abortIf, assertFound, config, discoverCommands, env, importFile, initializeGlobalContext, loadPrototypes, outputDir, rebuildOutput } from '@arkstack/common'
import { existsSync, realpathSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path, { join } from 'node:path'

import { Arkstack } from '@arkstack/contract'
import { ArkstackConsoleApp } from './app'
import { BuildCommand } from './commands/BuildCommand'
import { DevCommand } from './commands/DevCommand'
import { Command, Kernel } from '@h3ravel/musket'
import { KeyGenerateCommand } from './commands/KeyGenerateCommand'
import { MakeCommand } from './commands/MakeCommand'
import { MakeController } from './commands/MakeController'
import { MakeFullResource } from './commands/MakeFullResource'
import { MakeResource } from './commands/MakeResource'
import { PublishCommand } from './commands/PublishCommand'
import { RouteList } from './commands/RouteList'
import logo from './logo'
import { str } from '@h3ravel/support'

export interface RunConsoleOptions {
    logo?: string;
}

/** 
 * A missing-module error from importing a stale/incomplete build artifact. 
 * 
 * @param error 
 * @returns 
 */
const isMissingModuleError = (error: unknown): boolean => {
    const code = (error as { code?: string })?.code

    return code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND'
}

/**
 * Loads the core application instance by importing the built bootstrap file.
 *
 * The kernel boots this for every command — including `build` — before the build
 * can run, so a stale or incomplete build artifact (source changed since the last
 * build: a module moved, renamed, or added) would otherwise wedge startup with
 * `Cannot find module '<outDir>/...'` and the build could never self-heal. When
 * that happens and source is present, regenerate the output once and retry.
 *
 * @returns
 */
const loadCoreApp = async () => {
    const dist = path.relative(Arkstack.rootDir(), outputDir())
    const bootstrapPath = join(Arkstack.rootDir(), `${dist}/core/bootstrap.js`)

    try {
        return (await importFile<{ app: any }>(bootstrapPath)).app
    } catch (error) {
        if (!isMissingModuleError(error) || !existsSync(join(Arkstack.rootDir(), 'src'))) {
            throw error
        }

        await rebuildOutput()

        return (await importFile<{ app: any }>(bootstrapPath)).app
    }
}

/**
 * Runs the console kernel, initializing the application and registering commands.
 * 
 * @param options 
 */
export const runConsoleKernel = async (options: RunConsoleOptions = {}) => {
    loadPrototypes()
    const app = await loadCoreApp()
    const stubsDir = process.env.ARKSTACK_STUBS_DIR
    globalThis.app = () => app as never
    globalThis.env = env
    globalThis.config = config
    globalThis.str = str
    globalThis.abort = abort
    globalThis.abortIf = abortIf
    globalThis.assertFound = assertFound
    globalThis.arkctx = {
        runtime: 'CLI',
    }

    await initializeGlobalContext()

    // Discover user commands from source via jiti so they are picked up without a
    // build and reflect edits on every run. Musket's glob discovery uses native
    // import(), which silently skips .ts files (see discoverCommands).
    const userCommands = await discoverCommands<typeof Command>()

    await Kernel.init(await new ArkstackConsoleApp(app, { stubsDir }).loadConfig(), {
        logo: options.logo ?? logo,
        name: 'Cmd',
        baseCommands: [
            RouteList,
            MakeResource,
            MakeController,
            MakeFullResource,
            DevCommand,
            BuildCommand,
            MakeCommand,
            KeyGenerateCommand,
            PublishCommand,
            ...userCommands,
        ],
        discoveryPaths: [
            join(Arkstack.rootDir(), 'node_modules', '@arkstack/*', 'dist', 'commands', '*.js'),
        ],
        exceptionHandler (exception) {
            throw exception
        },
    })
}

/**
 * Determines if the current module is being executed as the entry 
 * point of the application.
 * 
 * @returns 
 */
const isEntrypointExecution = () => {
    const argvEntry = process.argv[1]

    if (!argvEntry) {
        return false
    }

    try {
        const currentModulePath = realpathSync(fileURLToPath(import.meta.url))
        const entryPath = realpathSync(argvEntry)

        return currentModulePath === entryPath
    } catch {
        return import.meta.url === pathToFileURL(argvEntry).href
    }
}

if (isEntrypointExecution()) {
    await runConsoleKernel()
}

export * from './prepare/BuildInterfaces'
export * from './prepare/TSConfig'
#!/usr/bin/env node

import { config, env, importFile, initializeGlobalContext, loadPrototypes, outputDir } from '@arkstack/common'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path, { join } from 'node:path'

import { ArkstackConsoleApp } from './app'
import { BuildCommand } from './commands/BuildCommand'
import { DevCommand } from './commands/DevCommand'
import { Kernel } from '@h3ravel/musket'
import { MakeCommand } from './commands/MakeCommand'
import { MakeController } from './commands/MakeController'
import { MakeFullResource } from './commands/MakeFullResource'
import { MakeResource } from './commands/MakeResource'
import { RouteList } from './commands/RouteList'
import logo from './logo'
import { realpathSync } from 'node:fs'
import { str } from '@h3ravel/support'

export interface RunConsoleOptions {
    logo?: string;
}

/**
 * Loads the core application instance by importing the bootstrap file.
 * 
 * @returns 
 */
const loadCoreApp = async () => {
    const dist = path.relative(process.cwd(), outputDir())

    const bootstrapPath = join(process.cwd(), `${dist}/core/bootstrap.js`)

    const module = await importFile<{ app: any }>(bootstrapPath)

    return module.app
}

/**
 * Runs the console kernel, initializing the application and registering commands.
 * 
 * @param options 
 */
export const runConsoleKernel = async (options: RunConsoleOptions = {}) => {
    loadPrototypes()
    const app = await loadCoreApp()
    const dist = path.relative(process.cwd(), outputDir())
    const stubsDir = process.env.ARKSTACK_STUBS_DIR
    globalThis.app = () => app as never
    globalThis.env = env
    globalThis.config = config
    globalThis.str = str
    globalThis.arkctx = {
        runtime: 'CLI',
    }

    await initializeGlobalContext()
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
        ],
        discoveryPaths: [
            join(process.cwd(), 'src', 'app', 'console', 'commands/*.ts'),
            join(process.cwd(), 'src', 'app/console/commands/*.js'),
            join(process.cwd(), 'src', 'app/console/commands/*.mjs'),
            join(process.cwd(), dist, 'app/console/commands/*.js'),
            join(process.cwd(), dist, 'app/console/commands/*.mjs'),
            join(process.cwd(), 'node_modules', '@arkstack/*', 'dist', 'commands', '*.js'),
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
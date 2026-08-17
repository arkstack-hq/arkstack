import { CliApp, applyRuntimeConfig, getDefaultConfig } from 'resora'
import { ConsoleAppOptions, Core } from './types'
// oxlint-disable typescript/no-explicit-any
import path, { join } from 'node:path'

import { Arkstack } from '@arkstack/contract'
import { Musket } from '@h3ravel/musket'
import { defaultConfig } from './config'
import { disposeArkormRuntime } from 'arkormx'
import { existsSync } from 'node:fs'
import { resolveStubsDir } from './helpers'

export class ArkstackConsoleApp<TCore extends Core> extends CliApp {
    core: TCore
    private readonly options: ConsoleAppOptions

    constructor(
        core: TCore,
        options: ConsoleAppOptions,
    ) {
        super()
        this.core = core
        this.options = options
        this.mergeConfig()
    }

    registerMusketListeners(musket: Musket<this>): void {
        musket.afterHandle.on(async () => {
            await disposeArkormRuntime()
            process.exit(0)
        })
    }

    makeController = (name: string, opts: any) => {
        this.mergeConfig()
        const normalized = (name.endsWith('Controller') ? name.replace(/controller/i, '') : name)
        let controllerName = normalized.endsWith('Controller') ? normalized : `${normalized}Controller`
        const controllersDir = path.resolve(Arkstack.rootDir(), 'src', 'app/http/controllers')
        const fileName = `${controllerName}.${opts?.ext ?? 'ts'}`
        const outputPath = join(controllersDir, fileName)

        const stubsDir = resolveStubsDir(this.config as any, this.options, this.core)
        if (!stubsDir) {
            console.error('Error: stubsDir is not configured. Set stubsDir in resora.config.js.')
            process.exit(1)
        }

        const stubPath = join(
            stubsDir,
            opts.model
                ? (this.config.stubs as any).model
                : opts.api
                    ? (this.config.stubs as any).api
                    : (this.config.stubs as any).controller,
        )

        if (!existsSync(stubPath)) {
            console.error(`Error: Stub file ${stubPath} not found.`)
            process.exit(1)
        }

        controllerName = controllerName.split('/').pop() as string
        this.generateFile(
            stubPath,
            outputPath,
            {
                // If class name contains / or ., take only the last part for the class name
                ControllerName: controllerName,
                Model: opts.model?.pascalCase(),
                Param: opts.model?.toLowerCase(),
                ModelName: opts.model?.camelCase(),
                Name: controllerName.replace(/controller/i, ''),
            },
            opts,
        )

        return outputPath
    }

    /**
     * Normalize a file path by removing the current working directory from it. 
     * 
     * @param p 
     * @returns 
     */
    normalizePath = (p: string) => {
        return p.replace(Arkstack.rootDir(), '')
    }

    /**
     * Recursively merge defaultConfig with config from resora.config.js, giving 
     * precedence to resora.
     */
    mergeConfig = () => {
        this.config = {
            ...getDefaultConfig(),
            ...defaultConfig(this.core),
            ...this.config,
            stubs: {
                ...defaultConfig(this.core).stubs,
                ...this.config?.stubs,
            },
        }

        try {
            applyRuntimeConfig({ ...this.config, ...config('resources', {}) })
        } catch { /** */ }
    }
}

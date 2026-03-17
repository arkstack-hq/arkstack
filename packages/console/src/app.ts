// oxlint-disable typescript/no-explicit-any
import path, { isAbsolute, join } from 'node:path'

import { CliApp } from 'resora'
import { existsSync } from 'node:fs'

interface Core {
    [k: string]: any
    getDriver: () => {
        [k: string]: any
        name: string
    }
}

export interface ConsoleAppOptions {
    stubsDir?: string;
}

export const resolveStubsDir = (
    config: { localStubsDir?: string } | undefined,
    options?: ConsoleAppOptions,
    core?: Core

) => {
    const configuredDir = config?.localStubsDir

    if (configuredDir) {
        return isAbsolute(configuredDir)
            ? configuredDir
            : join(process.cwd(), configuredDir)
    }

    if (!options?.stubsDir) {
        const driver = core?.getDriver().name ?? 'h3'
        let stubsDir = path.resolve(process.cwd(), `node_modules/@arkstack/driver-${driver}/stubs`)
        if (!existsSync(stubsDir)) {
            stubsDir = path.resolve(process.cwd(), 'stubs')
        }

        return stubsDir
    }

    return options?.stubsDir
}

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
    }

    makeController = (name: string, opts: any) => {
        const normalized = (name.endsWith('Controller') ? name.replace(/controller/i, '') : name)

        let controllerName = normalized.endsWith('Controller') ? normalized : `${normalized}Controller`
        const controllersDir = path.resolve(process.cwd(), 'src', 'app/http/controllers')
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
                ModelName: opts.model?.camelCase(),
                Name: controllerName.replace(/controller/i, ''),
            },
            opts,
        )

        return outputPath
    }

    normalizePath = (p: string) => {
        return p.replace(process.cwd(), '')
    }
}

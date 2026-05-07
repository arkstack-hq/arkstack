import type { ViewComposer, ViewComposerName, ViewData, ViewFactoryOptions, ViewName } from './types'
import { mergeData, runComposer, runComposerSync } from './helpers'
import { parsePackageViewName, resolvePackageViewsPath } from './packageViews'

import { Edge } from 'edge.js'
import { ViewInstance } from './ViewInstance'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export class ViewFactory {
    readonly edge: Edge
    private sharedData: ViewData = {}
    private composers = new Map<ViewName, ViewComposer[]>()
    private mountedPackages = new Set<string>()
    private packageViewsPath: string

    constructor(options: ViewFactoryOptions = {}) {
        this.edge = options.edge ?? Edge.create({ cache: options.cache })
        this.packageViewsPath = options.packageViewsPath ?? 'resources/views'
        this.mount(options.viewsPath ?? resolve(process.cwd(), 'src', 'resources', 'views'))
    }

    make (name: ViewName, data: ViewData = {}) {
        const edgeName = this.resolveName(name)

        return new ViewInstance(
            name,
            { ...this.sharedData, ...data },
            this.edge,
            async view => await this.runComposers(name, view),
            view => this.runComposersSync(name, view),
            edgeName,
        )
    }

    first (names: ViewName[], data: ViewData = {}) {
        const name = names.find(candidate => this.exists(candidate))

        if (!name) {
            throw new Error(`None of the given views exist: ${names.join(', ')}`)
        }

        return this.make(name, data)
    }

    exists (name: ViewName) {
        const edgeName = this.resolveName(name)

        if (this.edge.loader.templates[edgeName]) {
            return true
        }

        try {
            return existsSync(this.edge.loader.makePath(edgeName))
        } catch {
            return false
        }
    }

    share (key: string, value: any): this
    share (data: ViewData): this
    share (...data: any[]): this {
        mergeData(this.sharedData, data)

        return this
    }

    composer (names: ViewComposerName, composer: ViewComposer): this {
        for (const name of Array.isArray(names) ? names : [names]) {
            this.composers.set(name, [
                ...(this.composers.get(name) ?? []),
                composer,
            ])
        }

        return this
    }

    mount (viewsDirectory: string | URL): this
    mount (diskName: string, viewsDirectory: string | URL): this
    mount (diskName: string | URL, viewsDirectory?: string | URL): this {
        if (viewsDirectory === undefined) {
            this.edge.mount(diskName)

            return this
        }

        this.edge.mount(diskName as string, viewsDirectory)

        return this
    }

    raw (name: ViewName, contents: string): this {
        this.edge.registerTemplate(name, { template: contents })

        return this
    }

    flushShared () {
        this.sharedData = {}

        return this
    }

    flushComposers () {
        this.composers.clear()

        return this
    }

    private getComposers (name: ViewName) {
        const edgeName = this.resolveName(name)

        return [
            ...(this.composers.get('*') ?? []),
            ...(this.composers.get(edgeName) ?? []),
            ...(this.composers.get(name) ?? []),
        ]
    }

    private async runComposers (name: ViewName, view: ViewInstance) {
        for (const composer of this.getComposers(name)) {
            await runComposer(composer, view)
        }
    }

    private runComposersSync (name: ViewName, view: ViewInstance) {
        for (const composer of this.getComposers(name)) {
            runComposerSync(composer, view)
        }
    }

    private resolveName (name: ViewName) {
        const packageView = parsePackageViewName(name)

        if (!packageView) {
            return name
        }

        if (!this.mountedPackages.has(packageView.diskName)) {
            this.mount(
                packageView.diskName,
                resolvePackageViewsPath(packageView.nodePackageName, this.packageViewsPath),
            )
            this.mountedPackages.add(packageView.diskName)
        }

        return packageView.edgeName
    }
}

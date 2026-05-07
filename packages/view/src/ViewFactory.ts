import type { ViewComposer, ViewComposerName, ViewData, ViewFactoryOptions, ViewName } from './types'
import { mergeData, runComposer, runComposerSync } from './helpers'

import { Edge } from 'edge.js'
import { ViewInstance } from './ViewInstance'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export class ViewFactory {
    readonly edge: Edge
    private sharedData: ViewData = {}
    private composers = new Map<ViewName, ViewComposer[]>()

    constructor(options: ViewFactoryOptions = {}) {
        this.edge = options.edge ?? Edge.create({ cache: options.cache })
        this.mount(options.viewsPath ?? resolve(process.cwd(), 'resources', 'views'))
    }

    make (name: ViewName, data: ViewData = {}) {
        return new ViewInstance(
            name,
            { ...this.sharedData, ...data },
            this.edge,
            async view => await this.runComposers(view),
            view => this.runComposersSync(view),
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
        if (this.edge.loader.templates[name]) {
            return true
        }

        try {
            return existsSync(this.edge.loader.makePath(name))
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
        return [
            ...(this.composers.get('*') ?? []),
            ...(this.composers.get(name) ?? []),
        ]
    }

    private async runComposers (view: ViewInstance) {
        for (const composer of this.getComposers(view.name)) {
            await runComposer(composer, view)
        }
    }

    private runComposersSync (view: ViewInstance) {
        for (const composer of this.getComposers(view.name)) {
            runComposerSync(composer, view)
        }
    }
}

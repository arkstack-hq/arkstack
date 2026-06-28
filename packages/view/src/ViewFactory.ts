import type { ParserTagDefinitionContract, TagContract } from 'edge.js/types'
import type { ViewComposer, ViewComposerName, ViewData, ViewFactoryOptions, ViewName } from './types'
import { mergeData, normalizeViewData, runComposer, runComposerSync } from './helpers'
import { parsePackageViewName, resolvePackageViewsPath } from './packageViews'

import { Arkstack } from '@arkstack/contract'
import { Edge } from 'edge.js'
import { ViewInstance } from './ViewInstance'
import { existsSync } from 'node:fs'
import { getViewData } from './viewContext'
import { registerViteTag } from './vite'
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
        this.mount(options.viewsPath ?? resolve(Arkstack.rootDir(), 'src', 'resources', 'views'))
        registerViteTag(this)
    }

    /**
     * Create a new view instance for the given view name and data.
     * 
     * @param name 
     * @param data 
     * @returns 
     */
    make(name: ViewName, data: ViewData = {}) {
        const edgeName = this.resolveName(name)

        return new ViewInstance(
            name,
            normalizeViewData({ ...this.sharedData, ...getViewData(), ...data }),
            this.edge,
            async view => await this.runComposers(name, view),
            view => this.runComposersSync(name, view),
            edgeName,
        )
    }

    /**
     * Render the first view that exists from the given list of names.
     * 
     * @param names 
     * @param data 
     * @returns 
     */
    first(names: ViewName[], data: ViewData = {}) {
        const name = names.find(candidate => this.exists(candidate))

        if (!name) {
            throw new Error(`None of the given views exist: ${names.join(', ')}`)
        }

        return this.make(name, data)
    }

    /**
     * Check if a view exists.
     * 
     * @param name 
     * @returns 
     */
    exists(name: ViewName) {
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

    /**
     * Share data with all views. 
     * This data will be available in every view rendered by the factory.
     * 
     * @param key 
     * @param value 
     */
    share(key: string, value: any): this
    share(data: ViewData): this
    share(...data: any[]): this {
        mergeData(this.sharedData, data)

        return this
    }

    /**
     * Register a view composer for the given view name(s). 
     * A view composer is a function or object that is called when a view is 
     * rendered, allowing you to modify the view's data or perform other actions.
     * 
     * @param names 
     * @param composer 
     * @returns 
     */
    composer(names: ViewComposerName, composer: ViewComposer): this {
        for (const name of Array.isArray(names) ? names : [names]) {
            this.composers.set(name, [
                ...(this.composers.get(name) ?? []),
                composer,
            ])
        }

        return this
    }

    /**
     * Mount a directory containing views. 
     * If only one argument is provided, it will be treated as the views directory. 
     * If two arguments are provided, the first will be treated as the disk name and 
     * the second as the views directory.
     * 
     * @param viewsDirectory 
     */
    mount(viewsDirectory: string | URL): this
    mount(diskName: string, viewsDirectory: string | URL): this
    mount(diskName: string | URL, viewsDirectory?: string | URL): this {
        if (viewsDirectory === undefined) {
            this.edge.mount(diskName)

            return this
        }

        this.edge.mount(diskName as string, viewsDirectory)

        return this
    }

    /**
     * Register a raw template with the given name and contents.
     * 
     * @param name 
     * @param contents 
     * @returns 
     */
    raw(name: ViewName, contents: string): this {
        this.edge.registerTemplate(name, { template: contents })

        return this
    }

    /**
     * Register a custom tag with the given name, block type, seekable type, 
     * and compiler function.
     * 
     * @param tagName 
     * @param block 
     * @param seekable 
     * @param compiler 
     */
    tag(
        /**
         * The tag name
         */
        tagName: string,
        /**
         * Tag accepts content within the opening and
         * closing tags
         */
        block: boolean,

        /**
         * Tag accepts parameters
         */
        seekable: boolean,
        /**
         * The parser needs the `compile` method on every tag
         */
        compiler: ParserTagDefinitionContract['compile']
    ) {
        const tag: TagContract = {
            block,
            seekable,
            tagName,
            compile: compiler,
        }

        this.edge.registerTag(tag)
    }

    /**
     * Flush all shared data. This will remove all data that has been shared with all views.
     * 
     * @returns 
     */
    flushShared() {
        this.sharedData = {}

        return this
    }

    /**
     * Flush all registered composers. This will remove all composers that have 
     * been registered for any view.
     * 
     * @returns 
     */
    flushComposers() {
        this.composers.clear()

        return this
    }

    private getComposers(name: ViewName) {
        const edgeName = this.resolveName(name)

        return [
            ...(this.composers.get('*') ?? []),
            ...(this.composers.get(edgeName) ?? []),
            ...(this.composers.get(name) ?? []),
        ]
    }

    private async runComposers(name: ViewName, view: ViewInstance) {
        for (const composer of this.getComposers(name)) {
            await runComposer(composer, view)
        }
    }

    private runComposersSync(name: ViewName, view: ViewInstance) {
        for (const composer of this.getComposers(name)) {
            runComposerSync(composer, view)
        }
    }

    private resolveName(name: ViewName) {
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

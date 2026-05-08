import type { ViewComposer, ViewComposerName, ViewData, ViewFactoryOptions, ViewName } from './types'

import { ViewFactory } from './ViewFactory'
import type { ViewInstance } from './ViewInstance'

export class View {
    private static factory = new ViewFactory()

    /**
     * Bootstrap the view service
     */
    static boot () {
        Object.defineProperty(globalThis, 'view', {
            value: (name?: ViewName, data: ViewData = {}) => {
                if (name === undefined) {
                    return View.factoryInstance()
                }

                return View.make(name, data)
            },
            configurable: true,
            writable: true,
        })
    }

    static configure (options: ViewFactoryOptions = {}) {
        this.factory = new ViewFactory(options)

        return this.factory
    }

    static factoryInstance () {
        return this.factory
    }

    static make (name: ViewName, data: ViewData = {}): ViewInstance {
        return this.factory.make(name, data)
    }

    static first (names: ViewName[], data: ViewData = {}): ViewInstance {
        return this.factory.first(names, data)
    }

    static exists (name: ViewName) {
        return this.factory.exists(name)
    }

    static share (key: string, value: any): typeof View
    static share (data: ViewData): typeof View
    static share (...data: any[]) {
        if (typeof data[0] === 'string') {
            this.factory.share(data[0], data[1])
        } else {
            this.factory.share(data[0] ?? {})
        }

        return this
    }

    static composer (names: ViewComposerName, composer: ViewComposer): typeof View {
        this.factory.composer(names, composer)

        return this
    }

    static mount (viewsDirectory: string | URL): typeof View
    static mount (diskName: string, viewsDirectory: string | URL): typeof View
    static mount (diskName: string | URL, viewsDirectory?: string | URL) {
        if (viewsDirectory === undefined) {
            this.factory.mount(diskName)
        } else {
            this.factory.mount(diskName as string, viewsDirectory)
        }

        return this
    }

    static raw (name: ViewName, contents: string) {
        this.factory.raw(name, contents)

        return this
    }
}

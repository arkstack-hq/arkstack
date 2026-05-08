import type { ViewComposer, ViewComposerObject, ViewData, ViewName } from './types'

import { View } from './View'
import { ViewFactory } from './ViewFactory'
import { ViewInstance } from './ViewInstance'

export function view (): ViewFactory
export function view (name: ViewName, data?: ViewData): ViewInstance
export function view (name?: ViewName, data: ViewData = {}) {
    if (name === undefined) {
        return View.factoryInstance()
    }

    return View.make(name, data)
}

export const isClass = <T = unknown> (
    target: unknown
): target is new (...args: any[]) => T => {
    return typeof target === 'function'
        && /^class\s/.test(Function.prototype.toString.call(target))
}

export const mergeData = (target: ViewData, data: any[]) => {
    if (data.length === 0) {
        return target
    }

    if (typeof data[0] === 'string') {
        target[data[0]] = data[1]

        return target
    }

    for (const value of data) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(target, value)
        }
    }

    return target
}

export const runComposerSync = (composer: ViewComposer, view: ViewInstance) => {
    const result = runComposer(composer, view)

    if (result && typeof result.then === 'function') {
        throw new Error('Async view composers cannot be used with renderSync.')
    }
}

export const runComposer = (composer: ViewComposer, view: ViewInstance) => {
    if (typeof composer === 'function') {
        if (isClass<ViewComposerObject>(composer)) {
            return new composer().compose(view)
        }

        return composer(view)
    }

    return composer.compose(view)
}

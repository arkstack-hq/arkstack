import type { ViewComposer, ViewComposerObject, ViewData, ViewErrorRecord, ViewErrorValue, ViewName } from './types'

import { View } from './View'
import { ViewFactory } from './ViewFactory'
import { ViewInstance } from './ViewInstance'
import { normalizeViewErrors } from './ViewErrorBag'

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

const currentHttpSession = () => {
    try {
        const session = globalThis.session?.()

        return session && typeof session === 'object' ? session as Record<string, any> : undefined
    } catch {
        return undefined
    }
}

const hasRenderableErrors = (errors: unknown) => {
    if (!errors || typeof errors !== 'object') {
        return false
    }

    const bag = errors as Record<string, any>

    if (typeof bag.any === 'function') {
        return Boolean(bag.any())
    }

    if (typeof bag.has === 'function') {
        return Boolean(bag.has())
    }

    if (typeof bag.isNotEmpty === 'function') {
        return Boolean(bag.isNotEmpty())
    }

    if (typeof bag.all === 'function') {
        const messages = bag.all()

        if (Array.isArray(messages)) {
            return messages.length > 0
        }

        return !!messages && typeof messages === 'object' && Object.keys(messages).length > 0
    }

    return Object.keys(bag).length > 0
}

export const normalizeViewData = (data: ViewData = {}) => {
    const session = currentHttpSession()
    const ownErrors = normalizeViewErrors(data.errors)
    const sessionErrors = session?.errors
    const errors = hasRenderableErrors(ownErrors) || !sessionErrors
        ? ownErrors
        : normalizeViewErrors(sessionErrors)

    return {
        ...(session && !('session' in data) ? { session } : {}),
        ...(session && !('httpSession' in data) ? { httpSession: session } : {}),
        ...data,
        errors,
    }
}

export const mergeData = (target: ViewData, data: any[]) => {
    if (data.length === 0) {
        return target
    }

    if (typeof data[0] === 'string') {
        target[data[0]] = data[0] === 'errors' ? normalizeViewErrors(data[1]) : data[1]

        return target
    }

    for (const value of data) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(target, normalizeViewData(value))
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

export const isRecord = (value: unknown): value is Record<string, any> => {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}

export const toMessages = (value: ViewErrorValue): string[] => {
    if (Array.isArray(value)) {
        return value.flatMap(item => toMessages(item))
    }

    if (value instanceof Error) {
        return [value.message]
    }

    if (isRecord(value) && typeof value.message === 'string') {
        return [value.message]
    }

    if (value === null || typeof value === 'undefined') {
        return []
    }

    return [String(value)]
}

export const getMessageRecord = (source: unknown): ViewErrorRecord | undefined => {
    if (!isRecord(source)) {
        return undefined
    }

    if (typeof source.getMessageBag === 'function') {
        const bag = source.getMessageBag()

        if (bag && bag !== source) {
            const messages = getMessageRecord(bag)

            if (messages) {
                return messages
            }
        }
    }

    for (const method of ['getMessages', 'messagesRaw', 'toArray']) {
        if (typeof source[method] === 'function') {
            const messages = source[method]()

            if (isRecord(messages)) {
                return messages
            }
        }
    }

    if (typeof source.errors === 'function') {
        const errors = source.errors()
        const messages = getMessageRecord(errors) || (isRecord(errors) ? errors : undefined)

        if (messages) {
            return messages
        }
    }

    return getMessageRecord(source.errors) || (isRecord(source.errors) ? source.errors : undefined)
}
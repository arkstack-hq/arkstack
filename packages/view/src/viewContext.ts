import { AsyncLocalStorage } from 'node:async_hooks'
import type { ViewData } from './types'
import { isRecord, normalizeViewData } from './helpers'

const store = new AsyncLocalStorage<ViewData>()

const normalizeContextData = (data: ViewData = {}) => normalizeViewData(data)

export const getViewData = () => store.getStore() || {}

export const enterViewData = (data: ViewData = {}) => {
    store.enterWith(normalizeContextData({ ...getViewData(), ...data }))
}

export const runWithViewData = async <T> (data: ViewData, callback: () => T | Promise<T>) => {
    return await store.run(normalizeContextData(data), callback)
}

export const clearViewData = () => {
    store.disable()
}

export const collectViewData = (context: Record<string, any>): ViewData => {
    const ctx = isRecord(context.ctx) ? context.ctx : context
    const response = isRecord(context.response) ? context.response : undefined
    const locals = {
        ...(isRecord(ctx.res?.locals) ? ctx.res.locals : {}),
        ...(isRecord(ctx.response?.source?.locals) ? ctx.response.source.locals : {}),
        ...(isRecord(response?.source?.locals) ? response.source.locals : {}),
    }

    return normalizeContextData({
        ...('session' in ctx ? { session: ctx.session } : {}),
        ...('httpSession' in ctx ? { httpSession: ctx.httpSession } : {}),
        ...('errors' in ctx ? { errors: ctx.errors } : {}),
        ...locals,
    })
}

import type { Model, ModelStatic } from 'arkormx'
import { importFile, resolveRuntimeModule } from '../system'
import path from 'node:path'
import { Arkstack } from '@arkstack/contract'
import { RequestException } from '../Exceptions/RequestException'

import { createRequire } from 'node:module'
import { PaginationOptions } from '../types'

export type AbstractModelConstructor<TModel = unknown> =
    abstract new (attributes?: Record<string, unknown>) => TModel

export type ModelConstructor<TModel extends Model = Model> =
    AbstractModelConstructor<TModel> &
    Pick<ModelStatic<TModel>, keyof ModelStatic<TModel>>


export interface ModelRegistry { }

type ModelName = Extract<keyof ModelRegistry, string>
type ModelModule = Record<string, unknown> & {
    default?: unknown;
}

/**
 * Checks and asserts if target is a class
 * 
 * @param target 
 * @returns 
 */
export const isClass = <T = unknown>(
    target: unknown
): target is new (...args: any[]) => T => {
    return typeof target === 'function'
        && /^class\s/.test(Function.prototype.toString.call(target))
}

export const normalizePositiveInteger = (value: unknown, fallback: number) => {
    const parsed = Number(value)

    if (!Number.isInteger(parsed) || parsed < 1) {
        return fallback
    }

    return parsed
}

/**
 * Extracts a safe pagination limit from a query object.
 * 
 * @param query 
 * @param defaults 
 * @default const defaults = { pageSize: 25, maxPageSize: 50 }
 * @returns 
 */
export const perPage = (
    query: {
        limit?: number;
        perPage?: number;
        per_page?: number;
        'per-page'?: number;
    },
    defaults: {
        perPage?: number;
        maxPerPage?: number
    }) => {

    const requestedPerPage = normalizePositiveInteger(
        query.limit ??
        query.perPage ??
        query['per-page'] ??
        query.per_page,
        defaults.perPage ?? 25
    )

    return Math.min(requestedPerPage, defaults.maxPerPage ?? 50)
}

/**
 * Extracts the current page and a safe pagination limit from a query object.
 * 
 * @param query 
 * @param defaults 
 * @default const defaults = { currentPage: 1, pageSize: 25, maxPageSize: 50 }
 * @returns 
 */
export const resolvePagination = (
    query: {
        page?: number;
        limit?: number;
        perPage?: number;
        per_page?: number;
        'per-page'?: number;
    },
    defaults: {
        page?: number;
        perPage?: number;
        maxPerPage?: number
    }): PaginationOptions => {
    const page = normalizePositiveInteger(query.page, defaults.page ?? 1)

    return {
        page,
        perPage: perPage(query, defaults)
    }
}

/**
 * Import an application model by name.
 *
 * Apps can augment `ModelRegistry` to make `getModel('User')` return `typeof User`.
 * Without a registry entry, pass the class type explicitly: `getModel<typeof User>('User')`.
 * 
 * @param modelName 
 */
export async function getModel<TName extends ModelName>(
    modelName: TName
): Promise<ModelRegistry[TName]>
export async function getModel<TModel extends AbstractModelConstructor = ModelConstructor>(
    modelName: string
): Promise<TModel>
export async function getModel(modelName: string) {
    const resolveModelExport = (module: ModelModule | unknown, modelName: string) => {
        if (!isModelModule(module)) {
            return module
        }

        return module.default ?? module[modelName] ?? module
    }

    const isModelModule = (value: unknown): value is ModelModule => (
        typeof value === 'object' && value !== null
    )

    const { getUserConfig } = await import('arkormx')
    const modelPath = getUserConfig().paths?.models || './src/models'
    const sourcePath = path.join(
        path.isAbsolute(modelPath) ? modelPath : path.join(Arkstack.rootDir(), modelPath),
        modelName
    )
    // In production the source tree is absent; resolve to the build output.
    const modulePath = resolveRuntimeModule(sourcePath)
    const module = await importFile<ModelModule | unknown>(modulePath)
    const exportName = path.basename(modelName, path.extname(modelName))
    const model = resolveModelExport(module, exportName)

    if (typeof model !== 'function') {
        throw new Error(`Model "${modelName}" not found`)
    }

    return model
}

const isModelModule = (value: unknown): value is ModelModule => (
    typeof value === 'object' && value !== null
)

const resolveModelExport = (
    module: ModelModule | unknown,
    modelName: string
) => {
    if (!isModelModule(module)) {
        return module
    }

    return module.default ?? module[modelName] ?? module
}

/**
 * Synchronously import an application model by name.
 *
 * Apps can augment `ModelRegistry` to make `getModel('User')` return `typeof User`.
 * Without a registry entry, pass the class type explicitly: `getModel<typeof User>('User')`.
 * 
 * @param modelName 
 */
export function getModelSync<TName extends ModelName>(
    modelName: TName
): ModelRegistry[TName]
export function getModelSync<
    TModel extends AbstractModelConstructor = ModelConstructor
>(
    modelName: string
): TModel
export function getModelSync(modelName: string) {
    const require = createRequire(import.meta.url)

    const { Arkorm, getUserConfig } = require('arkormx') as typeof import('arkormx')

    const exportName = path.basename(
        modelName,
        path.extname(modelName)
    )

    /*
     * Prefer models that have already been loaded and registered.
     */
    const registeredModel = Arkorm
        .getRegisteredModels()
        .find((model) => model.name === exportName)

    if (registeredModel) {
        return registeredModel
    }

    const modelPath = getUserConfig().paths?.models || './src/models'

    const sourcePath = path.join(
        path.isAbsolute(modelPath)
            ? modelPath
            : path.join(Arkstack.rootDir(), modelPath),
        modelName
    )

    /*
     * In production, resolve the corresponding build output.
     */
    const modulePath = resolveRuntimeModule(sourcePath)
    const module = require(modulePath) as ModelModule | unknown
    const model = resolveModelExport(module, exportName)

    if (typeof model !== 'function') {
        throw new Error(`Model "${modelName}" not found`)
    }

    return model
}

export const initializeGlobalContext = async (
    { Request, Response, Session }: { Request?: any, Response?: any, Session?: any } = {}
) => {
    try {
        const { Request: Req, Response: Res, Session: Ses } = await import('@arkstack/http')
        Session ??= new Ses()
        Request ??= new Req()
        Response ??= new Res()
    } catch {
        Session ??= new class { }
        Request ??= new class { }
        Response ??= new class { }
    }

    globalThis.session ??= () => Session
    globalThis.request ??= () => Request
    globalThis.response ??= () => Response
}

/**
 * Thows to abort the current request
 * 
 * @param message 
 * @param code 
 * @throws {RequestException}
 */
export const abort = (
    message: string = 'Request Aborted',
    code: number = 404,
): void => {
    RequestException.abortIf(true, message, code)
}

/**
 * Asserts that a boolean condition is true. 
 * 
 * @param boolean 
 * @param message 
 * @param code 
 * @throws {RequestException} Throws if the boolean condition is true.
 */
export const abortIf = <T>(
    boolean: T,
    message: string = 'Request Aborted',
    code: number = 404,
): asserts  boolean is T => {
    RequestException.abortIf(boolean, message, code)
}

/**
 * Asserts that a value is not null or undefined. 
 * 
 * @param value 
 * @param message 
 * @param code 
 * @throws {RequestException} Throws if the value is null or undefined.
 */
export const assertFound = <T>(
    value: T | null | undefined,
    message: string,
    code: number = 404,
): asserts value is T => {
    if (!value) {
        throw new RequestException(message, code)
    }
}
import type { Model, ModelStatic, RegisteredModelClass, RegisteredModelName, RelatedModelClass } from 'arkormx'
import { getModel as getArkormxModel } from 'arkormx'
import { RequestException } from '../Exceptions/RequestException'

import { PaginationOptions } from '../types'

export type AbstractModelConstructor<TModel = unknown> =
    abstract new (attributes?: Record<string, unknown>) => TModel

export type ModelConstructor<TModel extends Model = Model> =
    AbstractModelConstructor<TModel> &
    Pick<ModelStatic<TModel>, keyof ModelStatic<TModel>>


export interface ModelRegistry { }

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
    defaults?: {
        perPage?: number;
        maxPerPage?: number
    }) => {

    const requestedPerPage = normalizePositiveInteger(
        query.limit ??
        query.perPage ??
        query['per-page'] ??
        query.per_page,
        defaults?.perPage ?? 25
    )

    return Math.min(requestedPerPage, defaults?.maxPerPage ?? 50)
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
    defaults?: {
        page?: number;
        perPage?: number;
        maxPerPage?: number
    }): PaginationOptions => {
    const page = normalizePositiveInteger(query.page, defaults?.page ?? 1)

    return {
        page,
        perPage: perPage(query, defaults)
    }
}

/**
 * Synchronously resolve an application model by name.
 *
 * Registered models are returned first. If a model has not been registered yet,
 * ArkORM loads it from the configured models paths, registers it, and returns
 * the matching constructor.
 *
 * @param modelName
 * @alias {@link getArkormxModel}
 * @returns
 */
export function getModel<TName extends RegisteredModelName>(modelName: TName): RegisteredModelClass<TName>
export function getModel<TModel extends RelatedModelClass = RelatedModelClass>(modelName: string): TModel;
export function getModel<TModel extends RelatedModelClass = RelatedModelClass>(modelName: string): TModel {
    return getArkormxModel(modelName)
}

/**
 * Synchronously import an application model by name.
 *
 * Apps can augment `ModelRegistry` to make `getModel('User')` return `typeof User`.
 * Without a registry entry, pass the class type explicitly: `getModel<typeof User>('User')`.
 * 
 * @param modelName 
 * @alias {@link getArkormxModel}
 * @deprecated 0.17.27 - Use {@link getModel} or {@link getArkormxModel}
 */
export function getModelSync<TName extends RegisteredModelName>(modelName: TName): RegisteredModelClass<TName>
export function getModelSync<TModel extends RelatedModelClass = RelatedModelClass>(modelName: string): TModel;
export function getModelSync<TModel extends RelatedModelClass = RelatedModelClass>(modelName: string): TModel {
    return getArkormxModel(modelName)
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
import { getUserConfig, type Model, type ModelStatic } from 'arkormx'
import { importFile } from '../system'
import path from 'node:path'

export type AbstractModelConstructor<TModel = unknown> =
    abstract new (attributes?: Record<string, unknown>) => TModel

export type ModelConstructor<TModel extends Model = Model> =
    AbstractModelConstructor<TModel> &
    Pick<ModelStatic<TModel>, keyof ModelStatic<TModel>>

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ModelRegistry { }

type ModelName = Extract<keyof ModelRegistry, string>
type ModelModule = Record<string, unknown> & {
    default?: unknown;
}

/**
 * Determine the number of items to return per page based on the provided query parameters.
 * 
 * @param query 
 * @returns 
 */
export const perPage = (query: { limit?: number; perPage?: number }) => {

    const requestedPerPage = Number(query.limit ?? query.perPage ?? 15)

    return Number.isFinite(requestedPerPage) && requestedPerPage > 0
        ? Math.min(requestedPerPage, 50)
        : 15
}

/**
 * Import an application model by name.
 *
 * Apps can augment `ModelRegistry` to make `getModel('User')` return `typeof User`.
 * Without a registry entry, pass the class type explicitly: `getModel<typeof User>('User')`.
 * 
 * @param modelName 
 */
export async function getModel<TName extends ModelName> (
    modelName: TName
): Promise<ModelRegistry[TName]>
export async function getModel<TModel extends AbstractModelConstructor = ModelConstructor> (
    modelName: string
): Promise<TModel>
export async function getModel (modelName: string) {
    const resolveModelExport = (module: ModelModule | unknown, modelName: string) => {
        if (!isModelModule(module)) {
            return module
        }

        return module.default ?? module[modelName] ?? module
    }

    const isModelModule = (value: unknown): value is ModelModule => (
        typeof value === 'object' && value !== null
    )

    const modelPath = getUserConfig().paths?.models || './src/models'
    const modulePath = path.join(
        path.isAbsolute(modelPath) ? modelPath : path.join(process.cwd(), modelPath),
        modelName
    )
    const module = await importFile<ModelModule | unknown>(modulePath)
    const exportName = path.basename(modelName, path.extname(modelName))
    const model = resolveModelExport(module, exportName)

    if (typeof model !== 'function') {
        throw new Error(`Model "${modelName}" not found`)
    }

    return model
}

export const initializeGlobalContext = async (Request?: any, Response?: any) => {
    try {
        const { Request: Req, Response: Res } = await import('@arkstack/http')
        Request ??= new Req()
        Response ??= new Res()
    } catch {
        Request ??= new class { }
        Response ??= new class { }
    }

    globalThis.request ??= () => Request
    globalThis.response ??= () => Response
}
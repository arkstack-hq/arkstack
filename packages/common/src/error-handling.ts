import pino, { type Logger as PinoLogger } from 'pino'
import path from 'node:path'
import { ArkstackErrorPayload, ArkstackErrorShape } from './types'

const loggerCache = new Map<string, PinoLogger>()

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
)

export const toErrorShape = (value: unknown): ArkstackErrorShape | undefined => (
    isRecord(value) ? value as unknown as ArkstackErrorShape : undefined
)

export const normalizeStatusCode = (value: unknown, fallback: number = 500) => {
    const code = typeof value === 'number' ? value : Number(value)

    return Number.isInteger(code) && code >= 100 && code < 600 ? code : fallback
}

export const getErrorLogger = () => {
    const destination = path.resolve(process.cwd(), 'storage/logs/error.log')

    if (!loggerCache.has(destination)) {
        loggerCache.set(destination, pino({
            level: 'error',
        }, pino.destination({
            dest: destination,
            mkdir: true,
            sync: false,
        })))
    }

    return loggerCache.get(destination)!
}

export const serializeError = (value: unknown, seen: WeakSet<object> = new WeakSet()): unknown => {
    if (Array.isArray(value)) {
        return value.map((entry) => serializeError(entry, seen))
    }

    if (!isRecord(value)) {
        return value
    }

    if (seen.has(value)) {
        return '[Circular]'
    }

    seen.add(value)

    const serialized: Record<string, unknown> = {}

    if (value instanceof Error) {
        serialized.name = value.name
        serialized.message = value.message
        serialized.stack = value.stack
    }

    for (const key of Reflect.ownKeys(value)) {
        const property = typeof key === 'string' ? key : key.toString()
        const descriptor = Object.getOwnPropertyDescriptor(value, key)

        if (!descriptor || !('value' in descriptor)) {
            continue
        }

        serialized[property] = serializeError(descriptor.value, seen)
    }

    return serialized
}

export const getPrimaryError = (error: ArkstackErrorShape | string) => {
    if (typeof error === 'string') {
        return error
    }

    return toErrorShape(error.cause) ?? error
}

export const getValidationErrors = (error: ArkstackErrorShape) => {
    if (typeof error.errors === 'function') {
        return error.errors()
    }

    return error.errors
}

export const isValidationError = (error: unknown): error is ArkstackErrorShape => {
    const candidate = toErrorShape(error)

    return typeof candidate?.errors !== 'undefined'
}

export const isModelNotFoundError = (error: unknown): error is ArkstackErrorShape => {
    const candidate = toErrorShape(error)

    return typeof candidate?.getModelName === 'function'
}

export const shouldHideStack = () => {
    const value = process.env.HIDE_ERROR_STACK

    return value === 'true' || value === '1' || value === 'on'
}

export const shouldLogError = (error: unknown) =>
    !isValidationError(error) &&
    !isModelNotFoundError(error)

export const createErrorPayload = (
    err: ArkstackErrorShape | string,
    fallbackMessage: string = 'Something went wrong',
): ArkstackErrorPayload => {
    const primaryError = getPrimaryError(err)
    const detailedError = typeof primaryError === 'string'
        ? undefined
        : primaryError
    const validationError = detailedError && isValidationError(detailedError)
        ? detailedError
        : undefined
    const modelNotFoundError = detailedError && isModelNotFoundError(detailedError)
        ? detailedError
        : undefined
    const payload: ArkstackErrorPayload = {
        status: 'error',
        code: typeof err === 'string'
            ? 500
            : normalizeStatusCode(detailedError?.statusCode ?? detailedError?.status),
        message: typeof err === 'string'
            ? `${fallbackMessage}: ${err}`
            : detailedError?.message || err.message || fallbackMessage,
    }

    if (validationError) {
        payload.code = normalizeStatusCode(validationError.statusCode ?? validationError.status, 422)
        payload.message = validationError.message || fallbackMessage
        payload.errors = getValidationErrors(validationError)
    } else if (modelNotFoundError) {
        payload.code = 404
        payload.message = `${modelNotFoundError.getModelName?.()} not found!`
    } else if (detailedError?.stack) {
        const [stackLine, ...rest] = detailedError.stack.split('\n')
        const [key, content = ''] = stackLine.split(':')

        payload.errors = {
            [key]: [content.trim(), ...rest.map((entry: string) => entry.trim())]
        }
    }

    if (
        detailedError &&
        process.env.NODE_ENV === 'development' &&
        !shouldHideStack() &&
        !validationError
    ) {
        payload.stack = detailedError.stack
    }

    if (!validationError || payload.code === 404) {
        delete payload.errors
        delete payload.stack
    }

    return payload
}

export const logUnhandledError = (
    err: unknown,
    request: Record<string, unknown>,
    message: string,
) => {
    getErrorLogger().error({
        error: serializeError(err),
        request,
    }, message)
}
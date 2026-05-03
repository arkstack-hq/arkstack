import pino, { type Logger as PinoLogger } from 'pino'
import path from 'node:path'
import { ArkstackErrorPayload, ArkstackErrorShape } from './types'

export class ErrorHandler {
    private static loggerCache = new Map<string, PinoLogger>()

    private static isRecord (value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null
    }

    static toErrorShape (value: unknown): ArkstackErrorShape | undefined {
        return ErrorHandler.isRecord(value) ? value as unknown as ArkstackErrorShape : undefined
    }

    static normalizeStatusCode (value: unknown, fallback: number = 500) {
        const code = typeof value === 'number' ? value : Number(value)

        return Number.isInteger(code) && code >= 100 && code < 600 ? code : fallback
    }

    static getErrorLogger () {
        const destination = path.resolve(process.cwd(), 'storage/logs/error.log')

        if (!ErrorHandler.loggerCache.has(destination)) {
            ErrorHandler.loggerCache.set(destination, pino({
                level: 'error',
            }, pino.destination({
                dest: destination,
                mkdir: true,
                sync: false,
            })))
        }

        return ErrorHandler.loggerCache.get(destination)!
    }

    static serializeError (
        value: unknown,
        seen: WeakSet<object> = new WeakSet()
    ): unknown {
        if (Array.isArray(value)) {
            return value.map((entry) => ErrorHandler.serializeError(entry, seen))
        }

        if (!ErrorHandler.isRecord(value)) {
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

            serialized[property] = ErrorHandler.serializeError(descriptor.value, seen)
        }

        return serialized
    }

    static getPrimaryError (error: ArkstackErrorShape | string) {
        if (typeof error === 'string') {
            return error
        }

        return ErrorHandler.toErrorShape(error.cause) ?? error
    }

    static getValidationErrors (error: ArkstackErrorShape) {
        if (typeof error.errors === 'function') {
            return error.errors()
        }

        return error.errors
    }

    static isValidationError (error: unknown): error is ArkstackErrorShape {
        const candidate = ErrorHandler.toErrorShape(error)

        return typeof candidate?.errors !== 'undefined'
    }

    static isModelNotFoundError (error: unknown): error is ArkstackErrorShape {
        const candidate = ErrorHandler.toErrorShape(error)

        return typeof candidate?.getModelName === 'function'
    }

    static shouldHideStack () {
        const value = process.env.HIDE_ERROR_STACK

        return value === 'true' || value === '1' || value === 'on'
    }

    static shouldLogError (error: unknown) {
        return !ErrorHandler.isValidationError(error) &&
            !ErrorHandler.isModelNotFoundError(error)
    }

    static createErrorPayload (
        err: ArkstackErrorShape | string,
        fallbackMessage: string = 'Something went wrong',
    ): ArkstackErrorPayload {
        const primaryError = ErrorHandler.getPrimaryError(err)
        const detailedError = typeof primaryError === 'string'
            ? undefined
            : primaryError
        const validationError = detailedError && ErrorHandler.isValidationError(detailedError)
            ? detailedError
            : undefined
        const modelNotFoundError = detailedError && ErrorHandler.isModelNotFoundError(detailedError)
            ? detailedError
            : undefined
        const payload: ArkstackErrorPayload = {
            status: 'error',
            code: typeof err === 'string'
                ? 500
                : ErrorHandler.normalizeStatusCode(detailedError?.statusCode ?? detailedError?.status),
            message: typeof err === 'string'
                ? `${fallbackMessage}: ${err}`
                : detailedError?.message || err.message || fallbackMessage,
        }

        if (validationError) {
            payload.code = ErrorHandler.normalizeStatusCode(validationError.statusCode ?? validationError.status, 422)
            payload.message = validationError.message || fallbackMessage
            payload.errors = ErrorHandler.getValidationErrors(validationError)
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
            !ErrorHandler.shouldHideStack() &&
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

    static logUnhandledError (
        err: unknown,
        request: Record<string, unknown>,
        message: string,
    ) {
        ErrorHandler.getErrorLogger().error({
            error: ErrorHandler.serializeError(err),
            request,
        }, message)
    }
}

export const toErrorShape = ErrorHandler.toErrorShape
export const normalizeStatusCode = ErrorHandler.normalizeStatusCode
export const getErrorLogger = ErrorHandler.getErrorLogger
export const serializeError = ErrorHandler.serializeError
export const getPrimaryError = ErrorHandler.getPrimaryError
export const getValidationErrors = ErrorHandler.getValidationErrors
export const isValidationError = ErrorHandler.isValidationError
export const isModelNotFoundError = ErrorHandler.isModelNotFoundError
export const shouldHideStack = ErrorHandler.shouldHideStack
export const shouldLogError = ErrorHandler.shouldLogError
export const createErrorPayload = ErrorHandler.createErrorPayload
export const logUnhandledError = ErrorHandler.logUnhandledError

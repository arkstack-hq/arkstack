import type { Request, Response } from 'express'

export class BaseError extends Error {

    errors?: { [key: string]: string[] | string } | undefined = undefined

    statusCode: number

    constructor(message?: string, statusCode: number = 400, options?: ErrorOptions) {
        super(message, options)
        this.statusCode = statusCode
    }
}

export class RequestError extends BaseError {

    statusCode: number

    constructor(message?: string, statusCode: number = 400, options?: ErrorOptions) {
        super(message, statusCode, options)
        this.statusCode = statusCode
    }

    /**
     * @param value 
     * @param message 
     * @param code 
     */
    static assertFound<T> (
        value: T | null | undefined,
        message: string,
        code: number = 404,
        _req?: Request,
        _res?: Response
    ): asserts value is T {
        if (!value) {
            throw new RequestError(message, code)
        }
    }

    /**
     * @param boolean 
     * @param message 
     * @param code 
     * @param req 
     * @param res 
     * @throws {RequestError} Throws a RequestError if the boolean condition is true. If req and res are provided, it will send the error response immediately.
     */
    static abortIf<T> (
        boolean: T,
        message: string,
        code?: number,
        _req?: Request,
        _res?: Response
    ): asserts  boolean is T {
        if (boolean) {
            throw new RequestError(message, code)
        }
    }
}

export class AutheticationError extends RequestError {
    constructor(message?: string, options?: ErrorOptions) {
        super(message, 401, options)
        this.message = message ?? 'Unauthenticated'
    }
}


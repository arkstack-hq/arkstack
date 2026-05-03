import { AppException } from './AppException'

export class RequestException extends AppException {
    statusCode: number

    constructor(message?: string, statusCode: number = 400, options?: ErrorOptions) {
        super(message, statusCode, options)
        this.statusCode = statusCode
    }

    /**
     * Asserts that a value is not null or undefined. 
     * 
     * @param value 
     * @param message 
     * @param code 
     * @throws {RequestException} Throws if the value is null or undefined.
     */
    static assertNotEmpty<T> (
        value: T | null | undefined,
        message: string,
        code: number = 404,
    ): asserts value is T {
        if (!value) {
            throw new RequestException(message, code)
        }
    }

    /**
     * Asserts that a boolean condition is true. 
     * 
     * @param boolean 
     * @param message 
     * @param code 
     * @throws {RequestException} Throws if the boolean condition is true.
     */
    static abortIf<T> (
        boolean: T,
        message: string,
        code?: number,
    ): asserts  boolean is T {
        if (boolean) {
            throw new RequestException(message, code)
        }
    }
}
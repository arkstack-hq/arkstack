import { Exception } from './Exception'

export class AppException extends Exception {
    errors?: { [key: string]: string[] | string } | undefined = undefined

    statusCode: number

    constructor(message?: string, statusCode: number = 400, options?: ErrorOptions) {
        super(message, options)
        this.statusCode = statusCode
    }
}
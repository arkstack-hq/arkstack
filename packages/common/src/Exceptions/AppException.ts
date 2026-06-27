import { Exception } from './Exception'

export class AppException extends Exception {
    errors?: { [key: string]: string[] | string } | undefined = undefined

    statusCode: number

    /**
     * Custom properties merged into the error response payload.
     *
     * When set, these are merged over the standard error payload (`status`,
     * `code`, `message`, …), letting a subclass add fields to — or reshape — the
     * returned error body.
     *
     * @example
     * ```ts
     * class PaymentException extends AppException {
     *   body = { error_code: 'PAYMENT_FAILED', retryable: true }
     * }
     * ```
     */
    body?: Record<string, unknown>

    constructor(message?: string, statusCode: number = 400, options?: ErrorOptions) {
        super(message, options)
        this.statusCode = statusCode
    }
}
import { describe, expect, test } from 'vitest'

import { AppException } from '../src/Exceptions/AppException'
import { ErrorHandler } from '../src/ErrorHandler'

describe('createErrorPayload custom body', () => {
    test('merges an AppException subclass body into the payload', () => {
        class PaymentException extends AppException {
            body = { error_code: 'PAYMENT_FAILED', retryable: true }
        }

        const payload = ErrorHandler.createErrorPayload(new PaymentException('Payment failed', 402))

        expect(payload.status).toBe('error')
        expect(payload.code).toBe(402)
        expect(payload.message).toBe('Payment failed')
        expect(payload.error_code).toBe('PAYMENT_FAILED')
        expect(payload.retryable).toBe(true)
    })

    test('body can override standard payload fields', () => {
        const error = new AppException('boom', 400)
        error.body = { status: 'failure', message: 'custom message' }

        const payload = ErrorHandler.createErrorPayload(error)

        expect(payload.status).toBe('failure')
        expect(payload.message).toBe('custom message')
        expect(payload.code).toBe(400)
    })

    test('an error without a body keeps the standard shape', () => {
        const payload = ErrorHandler.createErrorPayload(new AppException('nope', 400))

        expect(payload).toMatchObject({ status: 'error', code: 400, message: 'nope' })
        expect(Object.keys(payload)).not.toContain('error_code')
    })
})

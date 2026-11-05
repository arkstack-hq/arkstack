import type { FastifyReply, FastifyRequest } from 'fastify'
import { ErrorHandler, renderError } from '@arkstack/common'

const webMiddlewareKey = Symbol.for('arkstack:http:web')

const isRecord = (value: unknown): value is Record<PropertyKey, any> => {
  return typeof value === 'object' && value !== null
}

const isWebRequest = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false
  }

  return (
    value[webMiddlewareKey] === true ||
    value.arkstackWeb === true ||
    isWebRequest(value.context) ||
    isWebRequest(value.req)
  )
}

const redirectBackTarget = (req: FastifyRequest) => {
  const referer = req.headers.referer ?? req.headers.referrer
  const value = Array.isArray(referer) ? referer[0] : referer

  return typeof value === 'string' && value ? value : '/'
}

const flashValidationState = async (err: unknown, req: Record<string, any>, errors?: unknown) => {
  const session =
    req.httpSession ??
    (isRecord(req.session) && typeof req.session.addValidationErrors === 'function' ? req.session : undefined)

  if (!session) {
    return
  }

  if (errors) {
    session.addErrors?.(errors)
  } else {
    session.addValidationErrors?.(err)
  }

  await session.save?.()
}

export const defaultErrorHandler = async (err: Error, req: FastifyRequest, reply: FastifyReply) => {
  const responseBody = ErrorHandler.createErrorPayload(err)

  if (ErrorHandler.shouldLogError(err)) {
    ErrorHandler.logUnhandledError(
      err,
      {
        headers: req.headers,
        method: req.method,
        url: req.url,
      },
      'Unhandled Fastify request error',
    )
  }

  if (process.env.NODE_ENV === 'development') console.error(responseBody)

  if (reply.sent) {
    return
  }

  const acceptsHeader = req.headers.accept ?? ''
  const expectsJson = acceptsHeader.includes('application/json') || req.url.startsWith('/api/')
  const code = ErrorHandler.normalizeStatusCode(responseBody.code)

  if (code === 422 && !expectsJson && isWebRequest(req)) {
    await flashValidationState(err, req as never, responseBody.errors)

    return reply.redirect(redirectBackTarget(req), 302)
  }

  if (expectsJson) {
    return reply.code(code).send(responseBody)
  }

  return reply
    .code(code)
    .type('text/html')
    .send(
      renderError({
        message: String(responseBody.message),
        stack: typeof responseBody.stack === 'string' ? responseBody.stack : undefined,
        code,
      }),
    )
}

export default defaultErrorHandler

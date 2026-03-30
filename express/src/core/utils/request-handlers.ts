import { NextFunction, Request, Response } from 'express'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import { BaseError } from './errors'
import { ModelNotFoundException } from 'arkormx'
import { ServerResponse } from 'node:http'
import { ValidationException } from 'kanun'
import { buildHtmlErrorResponse } from '@arkstack/common'
import path from 'node:path'

/**
 * Global error handler for the Express application. 
 * It handles both string errors and instances of BaseError, logs the 
 * error details to a file, and sends a JSON response with the error information.
 * 
 * @param err 
 * @param req 
 * @param res 
 * @param next 
 */
export const ErrorHandler = (
  err: BaseError | string | ServerResponse,
  req: Request,
  res: Response,
  next?: NextFunction,
) => {
  const logsDir = path.resolve(process.cwd(), 'storage/logs')
  const message = typeof err !== 'string' ? (err as any).message : 'Something went wrong'
  let logContent = ''
  const error: Record<string, any> = {
    status: 'error',
    code: typeof err === 'string' || !(err instanceof BaseError) ? (err as any)?.statusCode ?? 500 : err.statusCode,
    message: typeof err === 'string' ? `${message}: ${err}` : err instanceof BaseError ? err.message : message,
  }

  if (typeof err !== 'string' && err instanceof BaseError && err.errors) {
    error.errors = err.errors
  } else if (typeof err !== 'string' && (err as BaseError).stack) {
    const [stack, ...rest] = (err as BaseError)?.stack?.split('\n') ?? []
    const [key, content] = stack.split(':')
    error.errors = { [key]: [content.trim(), ...rest.map((e) => e.trim())] }
  }

  if (err instanceof ModelNotFoundException) {
    error.code = 404
    error.message = `${err.getModelName()} not found!`
  }

  if (err instanceof ValidationException) {
    error.code = err.statusCode ?? 422
    error.message = err.message
    error.errors = err.errors()
  }

  if (
    typeof err !== 'string' &&
    env('NODE_ENV') === 'development' &&
    env<boolean>('HIDE_ERROR_STACK') !== true &&
    !(err instanceof ValidationException)
  ) {
    error.stack = err instanceof BaseError ? err.stack : undefined
  }

  try {
    mkdirSync(logsDir, { recursive: true })
    logContent = readFileSync(path.join(logsDir, 'error.log'), 'utf-8')
  } catch { /** */ }

  if (!(err instanceof ValidationException) &&
    !(err instanceof ModelNotFoundException)) {
    const newLogEntry = `[${new Date().toISOString()}] ${typeof err === 'string' ? err : err instanceof BaseError ? err.stack || err.message : err.toString()}\n\n`
    writeFileSync(path.join(logsDir, 'error.log'), logContent + newLogEntry, 'utf-8')
  }

  // If the request is an API call, return a JSON response. Otherwise, you might want to render an error page.
  const headers = req instanceof ServerResponse ? req.getHeaders() : req.headers
  const acceptsHeader = Array.isArray(headers.accept) ? headers.accept.join(',') : headers.accept ?? ''
  const expectsJson = acceptsHeader.includes('application/json') || req.originalUrl.startsWith('/api/')

  if (!(err instanceof ValidationException) || Number(error.code) === 404) {
    delete error.errors
    delete error.stack
  }

  if (process.env.NODE_ENV === 'development') console.error(error)

  if (res.headersSent) {
    next?.(err as never)

    return
  }

  if (expectsJson) {
    return res.status(error.code).json(error)
  } else {
    return res.status(error.code).setHeader('Content-Type', 'text/html').send(buildHtmlErrorResponse({
      message: error.message,
      stack: error.stack,
      code: error.code,
    }))
  }
}

export default ErrorHandler

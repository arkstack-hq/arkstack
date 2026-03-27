import { H3Event, HTTPError, HTTPResponse } from 'h3'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import { ModelNotFoundException } from 'arkormx'
import { ValidationException } from 'kanun'
import { buildHtmlErrorResponse } from '@arkstack/common'
import path from 'node:path'

/**
 * Global error handler for the H3 application. 
 * It handles both string errors and instances of HTTPError, logs the 
 * error details to a file, and returns an error response.
 * 
 * @param err 
 * @param event 
 * @returns 
 */
export const ErrorHandler = (err: HTTPError, event: H3Event) => {
  const cause: Error | undefined = err.cause as Error
  const logsDir = path.resolve(process.cwd(), 'storage/logs')
  const message = 'Something went wrong'
  let logContent = ''

  const error: Record<string, any> = {
    status: 'error',
    code: typeof err === 'string' || !err.status ? 500 : err.status,
    message: typeof err === 'string' ? `${message}: ${err}` : err.message || message,
  }

  event.res.status = error.code
  event.res.statusText = error.message

  if (typeof err !== 'string' && err.stack) {
    const [stack, ...rest] = err.stack.split('\n')
    const [key, content] = stack.split(':')
    error.errors = { [key]: [content.trim(), ...rest.map((e) => e.trim())] }
  }

  if (cause instanceof ModelNotFoundException) {
    error.code = 404
    error.message = `${cause.getModelName()} not found!`
  }

  if (cause instanceof ValidationException) {
    error.code = 422
    error.message = cause.message
    error.errors = cause.errors()
  }

  if (
    typeof err !== 'string' &&
    env('NODE_ENV') === 'development' &&
    env<boolean>('HIDE_ERROR_STACK') !== true &&
    !(cause instanceof ValidationException)
  ) {
    error.stack = err.stack
  }

  try {
    mkdirSync(logsDir, { recursive: true })
    logContent = readFileSync(path.join(logsDir, 'error.log'), 'utf-8')
  } catch { /** */ }

  if (!(err instanceof ValidationException) &&
    !(err instanceof ModelNotFoundException)) {
    const newLogEntry = `[${new Date().toISOString()}] ${typeof err === 'string' ? err : err.stack || err.message}\n\n`
    writeFileSync(path.join(logsDir, 'error.log'), logContent + newLogEntry, 'utf-8')
  }

  if (!(err instanceof ValidationException) || Number(error.code) === 404) {
    delete error.errors
    delete error.stack
  }

  if (process.env.NODE_ENV === 'development') console.error(error)

  // If the request is an API call, return a JSON response. Otherwise, you might want to render an error page.
  if (
    event.req.headers.get('accept')?.includes('application/json') ||
    event.req._url?.pathname?.startsWith('/api')
  ) {
    return {
      ...error,
      error: true,
      message: error.message,
    }
  }

  return new HTTPResponse(buildHtmlErrorResponse({
    message: error.message,
    stack: error.stack,
    code: error.code,
  }), {
    status: error.code,
    headers: {
      'Content-Type': 'text/html',
    },
  })
}

export default ErrorHandler

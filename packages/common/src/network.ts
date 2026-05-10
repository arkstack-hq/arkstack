import { config, env } from './system'

import { detect } from 'detect-port'
import { str } from '@h3ravel/support'

export const bootWithDetectedPort = async (
  boot: (port: number) => Promise<void>,
  preferredPort: number = 3000,
  app?: any
) => {
  if (app && !globalThis.app) globalThis.app = () => app
  globalThis.env = env
  globalThis.config = config
  globalThis.str = str
  globalThis.arkctx = {
    runtime: 'HTTP',
  }
  const port = await detect(preferredPort)
  await boot(port)
}


export const renderError = ({
  message = 'An unexpected error occurred.',
  stack,
  title,
  code = 500,
}: {
  message?: string;
  stack?: string;
  code?: number;
  title?: string;
}) => {
  const titleMap: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  }

  title = titleMap[code] || title || 'Error'

  return globalThis.view('~arkstack/common.error', {
    code,
    title,
    stack,
    message,
  }).renderSync()
}
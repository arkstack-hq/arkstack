import { config, env } from './system'

import { Arkstack } from '@arkstack/contract'
import { Hook } from '@arkstack/foundry'
import { bindGracefulShutdown } from './lifecycle'
import { detect } from 'detect-port'
import { initializeGlobalContext } from './utils'
import { str } from '@h3ravel/support'

export const bootWithDetectedPort = async <TApp, TRoutes = unknown, THandler = unknown> (
  boot: (port: number) => Promise<void>,
  preferredPort: number = 3000,
  app?: Arkstack<TApp, TRoutes, THandler>
) => {
  const port = await detect(preferredPort)

  if (Hook.has('boot', 'before')) Hook.get('boot', 'before', port, app)

  if (app && !globalThis.app) globalThis.app = () => app as never
  globalThis.env = env
  globalThis.config = config
  globalThis.str = str
  globalThis.arkctx = {
    runtime: 'HTTP',
  }
  await boot(port)
  await initializeGlobalContext()

  // Handle graceful shutdown
  bindGracefulShutdown(async () => await app?.shutdown())

  if (Hook.has('boot', 'after')) Hook.get('boot', 'after', port, app)
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
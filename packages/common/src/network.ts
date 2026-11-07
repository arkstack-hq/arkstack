import { abort, abortIf, assertFound, initializeGlobalContext } from './utils'
import { config, env } from './system'

import { ErrorPage, type ErrorPageOptions } from './ErrorPage'
import { Arkstack } from '@arkstack/contract'
import { Hook } from '@arkstack/foundry'
import { bindGracefulShutdown } from './lifecycle'
import { detect } from 'detect-port'
import { str } from '@h3ravel/support'

/**
 * Boots the app using an available port close to the requested port
 *when requested port is not available
 *
 * @param boot
 * @param preferredPort
 * @param app
 * @param defer
 */
export const bootWithDetectedPort = async <TApp, TRoutes = unknown, THandler = unknown>(
  boot: (port: number) => Promise<void>,
  preferredPort: number = 3000,
  app?: Arkstack<TApp, TRoutes, THandler>,
  defer?: boolean,
) => {
  const port = await detect(preferredPort)

  await Hook.emit('boot', 'before', port, app)

  if (app && !globalThis.app) globalThis.app = () => app as never
  globalThis.env = env
  globalThis.config = config
  globalThis.str = str
  globalThis.abort = abort
  globalThis.abortIf = abortIf
  globalThis.assertFound = assertFound
  globalThis.arkctx = {
    runtime: 'HTTP',
  }
  await boot(port)
  await initializeGlobalContext()

  // Handle graceful shutdown
  bindGracefulShutdown(async () => await app?.shutdown(), defer)

  await Hook.emit('boot', 'after', port, app)
}

/** Renders the HTML error page, with or without `@arkstack/view` installed. */
export const renderError = (options: ErrorPageOptions = {}) => ErrorPage.render(options)

import { applyRuntimeConfig, getDefaultConfig, setCtx } from 'resora'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { config, resolveRuntimeDir } from '@arkstack/common'

/**
 * Applies the application's resora configuration (`src/config/resources.ts`)
 * and binds the `{ req, reply }` context so Resources can build URLs and
 * pagination links. Route handlers run inside resora's request context
 * through the clear-router plugin.
 */
export const resora = () => {
  let resources: Record<string, unknown> | undefined

  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!resources) {
        resources = {
          ...getDefaultConfig(),
          ...config('resources', {}),
        } as Record<string, unknown>

        if (typeof resources.resourcesDir === 'string') {
          resources.resourcesDir = resolveRuntimeDir(resources.resourcesDir)
        }
      }

      applyRuntimeConfig(resources as never)
    } catch {
      /** No resources config; resora falls back to its defaults. */
    }

    setCtx({ req, res: reply })
  }
}

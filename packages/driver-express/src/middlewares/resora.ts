import { applyRuntimeConfig, getDefaultConfig, runWithCtx, setCtx } from 'resora'

import type { Handler } from 'express'
import { config, resolveRuntimeDir } from '@arkstack/common'

/**
 * Apply the application's resora configuration (`src/config/resources.ts`) and
 * bind the per-request `{ req, res }` context so Resources can build URLs and
 * pagination links.
 *
 * Replaces the manual `Resource.setCtx(...)` wiring: resora's runtime config is
 * applied from `config('resources')`, and the request is run within resora's
 * async context so downstream handlers resolve the correct context.
 */
export const resora = (): Handler => {
    // Resolve once: the merged config doesn't change between requests.
    let resources: Record<string, unknown> | undefined

    return (req, res, next) => {
        try {
            if (!resources) {
                // Merge over resora's defaults so unspecified keys (e.g. pagination
                // metadata) are never wiped when the app has no resources config.
                resources = { ...getDefaultConfig(), ...config('resources', {}) } as Record<string, unknown>

                // Resources are compiled into the build output; point resora's
                // resourcesDir at the runtime location (dist in production).
                if (typeof resources.resourcesDir === 'string') {
                    resources.resourcesDir = resolveRuntimeDir(resources.resourcesDir)
                }
            }

            applyRuntimeConfig(resources as never)
        } catch {
            /** No resources config; resora falls back to its defaults. */
        }

        setCtx({ req, res })

        return runWithCtx({ req, res }, () => next())
    }
}

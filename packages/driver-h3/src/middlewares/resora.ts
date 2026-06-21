import { applyRuntimeConfig, getDefaultConfig, runWithCtx, setCtx } from 'resora'

import type { H3Event } from 'h3'
import type { NextFunction } from 'clear-router/types/h3'
import { config } from '@arkstack/common'

/**
 * Apply the application's resora configuration (`src/config/resources.ts`) and
 * bind the per-request `{ req, res }` context so Resources can build URLs and
 * pagination links.
 *
 * Replaces the manual `Resource.setCtx(...)` wiring: resora's runtime config is
 * applied from `config('resources')`, and the request is run within resora's
 * async context so downstream handlers resolve the correct context.
 */
export const resora = () => {
    return async (event: H3Event, next: NextFunction) => {
        try {
            // Merge over resora's defaults so unspecified keys (e.g. pagination
            // metadata) are never wiped when the app has no resources config.
            applyRuntimeConfig({ ...getDefaultConfig(), ...config('resources', {}) } as never)
        } catch {
            /** No resources config; resora falls back to its defaults. */
        }

        const ctx = { req: event.req, res: event.res }
        setCtx(ctx)

        return runWithCtx(ctx, () => next())
    }
}
